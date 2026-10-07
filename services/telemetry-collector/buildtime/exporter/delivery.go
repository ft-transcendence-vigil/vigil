package exporter

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"go.opentelemetry.io/collector/consumer/consumererror"
)

type pendingDelivery struct {

	metadata	notification
	keys		[]dedupKey
	count		int

}

type byteCounter int

func (counter *byteCounter) Write(bytesWritten []byte) (int, error) {

	*counter += byteCounter(len(bytesWritten))
	return len(bytesWritten), nil

}

var _ io.Writer = (*byteCounter)(nil)

// Serializing delivery keeps visibility recovery and dedup retention atomic.
// Busy callers retry rather than waiting behind up to three callback attempts.
func deliver[T any](ctx context.Context, exporter *Exporter, signal string, rows []T, key func(T) dedupKey, fields func(T) (string, time.Time, map[string]string), insert func(context.Context, []T) error) error {

	if len(rows) == 0 {
		return nil
	}

	if !exporter.deliveryMu.TryLock() {
		return errDedupInFlight
	}

	defer exporter.deliveryMu.Unlock()

	id		:= exporter.newNotificationID()
	keys	:= make([]dedupKey, len(rows))
	var size byteCounter
	encoder := json.NewEncoder(&size)
	for i, row := range rows {

		keys[i] = key(row)
		_, _, attributes := fields(row)
		attributes["vigil.notification_id"] = id

		if err := encoder.Encode(row); err != nil {
			return consumererror.NewPermanent(fmt.Errorf("serialize %s: %w", signal, err))
		}

		if int(size) > exporter.Config.MaxSerializedBatchBytes {
			return consumererror.NewPermanent(fmt.Errorf("serialized %s batch exceeds %d bytes", signal, exporter.Config.MaxSerializedBatchBytes))
		}

	}

	incoming := make(map[dedupKey]bool, len(keys))

	for _, currentKey := range keys {
		incoming[currentKey] = true
	}

	recovered := make(map[dedupKey]bool)

	for i := 0; i < len(exporter.pending); {

		pending		:= exporter.pending[i]
		overlaps	:= false

		for _, currentKey := range pending.keys {
			if incoming[currentKey] {
				overlaps = true
				break
			}
		}
		if !overlaps {
			i++
			continue
		}

		if err := exporter.finishDelivery(ctx, pending); err != nil {
			return err
		}

		for _, currentKey := range pending.keys {
			recovered[currentKey] = true
		}
		exporter.pending = append(exporter.pending[:i], exporter.pending[i+1:]...)

	}

	// Recovered rows remain excluded even when their original dedup window expired.
	filteredRows	:= make([]T, 0, len(rows))
	filteredKeys	:= make([]dedupKey, 0, len(keys))

	for i, currentKey := range keys {
		if !recovered[currentKey] {
			filteredRows	= append(filteredRows, rows[i])
			filteredKeys	= append(filteredKeys, currentKey)
		}
	}
	reservation, retained, err := exporter.dedup.reserve(filteredKeys, exporter.now())

	if err != nil {
		return err
	}

	defer reservation.release()

	if len(retained) == 0 {
		return nil
	}

	stored	:= make([]T, 0, len(retained))
	latest	:= make(map[string]time.Time)

	for _, i := range retained {

		row						:= filteredRows[i]
		stored					= append(stored, row)
		service, timestamp, _	:= fields(row)

		if timestamp.After(latest[service]) {
			latest[service] = timestamp
		}

	}
	pending := &pendingDelivery{metadata: notification{NotificationID: id, SignalType: signal, Services: serviceMetadata(latest)}, keys: append([]dedupKey(nil), reservation.keys...), count: len(stored)}

	if err := insert(ctx, stored); err != nil {
		return fmt.Errorf("insert %s: %w", signal, err)
	}

	reservation.commit(exporter.now())
	exporter.pending = append(exporter.pending, pending)

	if err := exporter.finishDelivery(ctx, pending); err != nil {
		return err
	}

	exporter.pending = exporter.pending[:len(exporter.pending)-1]
	return nil

}

func (exporter *Exporter) finishDelivery(ctx context.Context, pending *pendingDelivery) error {

	if err := exporter.Storage.ConfirmVisible(ctx, pending.metadata.SignalType, pending.metadata.NotificationID, pending.count); err != nil {
		return fmt.Errorf("confirm %s visibility (insert already committed): %w", pending.metadata.SignalType, err)
	}

	pending.metadata.StoredAt = exporter.now().UTC()

	// Refresh retention after potentially delayed visibility recovery.
	exporter.dedup.mu.Lock()

	for _, currentKey := range pending.keys {
		exporter.dedup.entries[currentKey] = dedupEntry{expiresAt: pending.metadata.StoredAt.Add(exporter.dedup.window)}
	}

	exporter.dedup.mu.Unlock()

	if err := exporter.sendCallback(ctx, pending.metadata); err != nil {
		exporter.recordCallbackFailure(ctx, pending.metadata, err)
	}

	return nil

}
