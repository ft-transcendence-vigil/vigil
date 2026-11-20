package exporter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"sort"
	"time"

	"go.uber.org/zap"
)

// notification is the JSON contract for a visible batch, including one summary per service.
type notification struct {

	NotificationID	string					`json:"notification_id"`
	SignalType		string					`json:"signal_type"`
	StoredAt		time.Time				`json:"stored_at"`
	Services		[]notificationService	`json:"services"`

}

// notificationService pairs a service with the newest event timestamp in its stored rows.
type notificationService struct {

	Service			string		`json:"service"`
	LatestTimestamp	time.Time	`json:"latest_timestamp"`

}

// serviceMetadata converts event timestamps to UTC and sorts services for deterministic JSON.
func serviceMetadata(latest map[string]time.Time) []notificationService {

	services := make([]notificationService, 0, len(latest))

	for service, timestamp := range latest {
		services = append(services, notificationService{service, timestamp.UTC()})
	}

	// The comparison function closes over services and supplies the sort order.
	sort.Slice(services, func(i, j int) bool {

		return services[i].Service < services[j].Service

	})

	return services

}

// waitForCallback lets cancellation interrupt a retry delay.
func waitForCallback(ctx context.Context, delay time.Duration) error {

	timer := time.NewTimer(delay)
	defer timer.Stop()
	// Receive from whichever channel is ready. A canceled context closes Done.
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}

}

// sendCallback encodes the metadata once so every attempt posts the same notification.
func (exporter *Exporter) sendCallback(ctx context.Context, metadata notification) error {

	payload, err := json.Marshal(metadata)

	if err != nil {
		return fmt.Errorf("encode callback: %w", err)
	}

	for attempt := range 3 {

		// Give each HTTP attempt its own deadline derived from the delivery context.
		attemptCtx, cancel	:= context.WithTimeout(ctx, 10*time.Second)
		request, err		:= http.NewRequestWithContext(attemptCtx, http.MethodPost, exporter.Config.BackendCallbackURL, bytes.NewReader(payload))

		if err != nil {
			cancel()
			return fmt.Errorf("create callback: %w", err)
		}

		request.Header.Set("Content-Type", "application/json")

		response, err	:= exporter.callbackClient.Do(request)
		retry			:= err != nil

		if response != nil {
			// Bound draining; the response body is not part of the contract.
			_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
			response.Body.Close()
			if err == nil {
				if response.StatusCode == http.StatusNoContent {
					cancel()
					return nil
				}
				err		= fmt.Errorf("callback returned HTTP %d (expected 204)", response.StatusCode)
				retry	= response.StatusCode >= 500 && response.StatusCode <= 599
			}
		}

		// Release this attempt's timeout resources before sleeping or retrying.
		cancel()

		// Transport errors and HTTP 5xx responses can retry while the parent context is active.
		if !retry || attempt == 2 || ctx.Err() != nil {
			return err
		}

		// Shifting 1 left by attempt gives the power of two used for the backoff.
		// The random term adds less than 250 milliseconds of jitter.
		delay := time.Second*time.Duration(1<<attempt) + time.Duration(rand.Int64N(int64(250*time.Millisecond)))

		if err := exporter.wait(ctx, delay); err != nil {
			return err
		}

	}
	return nil

}
// recordCallbackFailure reports a failed notification without causing another insert.
func (exporter *Exporter) recordCallbackFailure(ctx context.Context, metadata notification, err error) {

	if exporter.callbackFailures != nil {
		exporter.callbackFailures.Add(ctx, 1)
	}

	if exporter.Settings.Logger != nil {
		exporter.Settings.Logger.Error("telemetry stored but callback failed", zap.String("notification_id", metadata.NotificationID), zap.String("signal_type", metadata.SignalType), zap.Error(err))
	}

}
