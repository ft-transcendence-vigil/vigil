package exporter

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"go.opentelemetry.io/collector/consumer/consumererror"
)

// pendingDelivery remembers an accepted insert that still needs visibility confirmation.
type pendingDelivery struct {

	metadata	notification
	keys		[]dedupKey
	count		int

}

// byteCounter measures the JSON stream without keeping a second copy of the request body.
type byteCounter int

func (counter *byteCounter) Write(bytesWritten []byte) (int, error) {

	// The pointer receiver updates the same counter on every encoder write.
	*counter += byteCounter(len(bytesWritten))
	return len(bytesWritten), nil

}

// Check at compile time that *byteCounter implements io.Writer.
var _ io.Writer = (*byteCounter)(nil)

// deliver uses the row type inferred from []T. The function arguments supply the
// signal-specific key, metadata, and storage operations for that same row type.
// The delivery lock makes visibility recovery and dedup retention one critical section.
func deliver[T any](ctx context.Context, exporter *Exporter, signal string, rows []T, key func(T) dedupKey, fields func(T) (string, time.Time, map[string]string), insert func(context.Context, []T) error) error {

	if len(rows) == 0 {
		return nil
	}

	// A concurrent call returns immediately when another call owns delivery.
	if !exporter.deliveryMu.TryLock() {
		return errDedupInFlight
	}

	defer exporter.deliveryMu.Unlock()

	id		:= exporter.newNotificationID()
	keys	:= make([]dedupKey, len(rows))
	var size byteCounter
	encoder := json.NewEncoder(&size)
	for i, row := range rows {

		// Hash the normalized row before replacing the notification ID. Measure the stamped
		// JSON rows, including duplicates and each encoder newline.
		keys[i] = key(row)
		// Copying the row copies the map reference, so this updates the row's own map.
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

	// Only overlapping input can retry visibility for a pending batch. Recovery uses the
	// original batch ID, count, and per-service metadata.
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
		// Splice out the recovered entry. The next item shifts into index i.
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

	// A failed insert frees the keys on return. Commit makes this cleanup a no-op.
	// Because defer runs in reverse order, cleanup finishes before deliveryMu unlocks.
	defer reservation.release()

	if len(retained) == 0 {
		return nil
	}

	// Build the insert and the callback summary from the same retained rows.
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
	// Copy the keys into their own slice for later visibility recovery.
	pending := &pendingDelivery{metadata: notification{NotificationID: id, SignalType: signal, Services: serviceMetadata(latest)}, keys: append([]dedupKey(nil), reservation.keys...), count: len(stored)}

	if err := insert(ctx, stored); err != nil {
		return fmt.Errorf("insert %s: %w", signal, err)
	}

	// An accepted insert gets committed keys and a pending record before the visibility check.
	// If that check fails, a matching retry can resume without inserting the rows again.
	reservation.commit(exporter.now())
	exporter.pending = append(exporter.pending, pending)

	if err := exporter.finishDelivery(ctx, pending); err != nil {
		return err
	}

	exporter.pending = exporter.pending[:len(exporter.pending)-1]
	return nil

}

// finishDelivery confirms the exact row count, timestamps the notification, and attempts
// the callback. Callback failure is recorded after storage has succeeded.
func (exporter *Exporter) finishDelivery(ctx context.Context, pending *pendingDelivery) error {

	if err := exporter.Storage.ConfirmVisible(ctx, pending.metadata.SignalType, pending.metadata.NotificationID, pending.count); err != nil {
		return fmt.Errorf("confirm %s visibility (insert already committed): %w", pending.metadata.SignalType, err)
	}

	pending.metadata.StoredAt = exporter.now().UTC()

	// While holding deliveryMu, take the dedup lock briefly to refresh key expiry.
	// Release the dedup lock before making the callback request.
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
