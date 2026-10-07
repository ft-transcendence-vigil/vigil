package exporter

import (
	"errors"
	"sync"
	"testing"
	"time"
)

func TestDedupKeys(tester *testing.T) {

	timestamp	:= time.Unix(100, 0)
	log			:= LogRow{ServiceName: "api", Severity: "info", Message: "hello", Timestamp: timestamp}
	sameLog		:= log

	if logDedupKey(log) != logDedupKey(sameLog) {
		tester.Fatal("the same log must have the same key")
	}

	otherLog := log
	otherLog.Timestamp = timestamp.Add(time.Millisecond)

	if logDedupKey(log) == logDedupKey(otherLog) {
		tester.Fatal("logs with different exact timestamps must not match")
	}

	metric		:= MetricRow{SeriesID: "series-a", Timestamp: timestamp, DedupPayload: "value-1"}
	otherMetric	:= metric
	otherMetric.DedupPayload = "value-2"

	if metricDedupKey(metric) == metricDedupKey(otherMetric) {
		tester.Fatal("different metric points must not match")
	}

	span		:= TraceRow{TraceID: "trace-a", SpanID: "span-a"}
	otherSpan	:= span
	otherSpan.SpanID = "span-b"

	if traceDedupKey(span) == traceDedupKey(otherSpan) {
		tester.Fatal("different spans must not match")
	}

	otherSpan = span
	otherSpan.Name = "renamed"

	if traceDedupKey(span) != traceDedupKey(otherSpan) {
		tester.Fatal("a retried span keeps its identity even if other fields change")
	}

}

func TestDedupLifecycle(tester *testing.T) {

	now							:= time.Unix(100, 0)
	deduplicator				:= newDeduplicator(10 * time.Minute)
	key							:= keyFrom("a")
	other						:= keyFrom("b")
	reservation, indices, err	:= deduplicator.reserve([]dedupKey{key, key}, now)

	if err != nil || len(indices) != 1 || indices[0] != 0 {
		tester.Fatalf("reserve: %v %v", indices, err)
	}

	if _, _, err := deduplicator.reserve([]dedupKey{other, key}, now.Add(time.Hour)); !errors.Is(err, errDedupInFlight) {

		tester.Fatalf("pending reservation: %v", err)
	}

	if len(deduplicator.entries) != 1 {
		tester.Fatal("conflicting batch must not partially reserve")
	}

	reservation.release()
	reservation.commit(now)
	reservation, indices, err = deduplicator.reserve([]dedupKey{key}, now)

	if err != nil || len(indices) != 1 {
		tester.Fatal("failed storage must allow retry")
	}

	reservation.commit(now)
	reservation.release()
	_, indices, err = deduplicator.reserve([]dedupKey{key}, now.Add(10*time.Minute-time.Nanosecond))

	if err != nil || len(indices) != 0 {
		tester.Fatal("committed duplicate must be suppressed")
	}

	reservation, indices, err = deduplicator.reserve([]dedupKey{key}, now.Add(10*time.Minute))

	if err != nil || len(indices) != 1 {
		tester.Fatal("expired keys must be accepted")
	}

	reservation.release()

}

func TestDedupConcurrentReservations(tester *testing.T) {

	deduplicator	:= newDeduplicator(time.Minute)
	key				:= keyFrom("same telemetry")
	var waitGroup sync.WaitGroup
	winners := make(chan *dedupReservation, 32)
	for range 32 {
		waitGroup.Go(func() {

			reservation, indices, err := deduplicator.reserve([]dedupKey{key}, time.Now())
			if err == nil && len(indices) == 1 {
				winners <- reservation
				return
			}

			if !errors.Is(err, errDedupInFlight) {
				tester.Errorf("unexpected result: %v %v", indices, err)
			}

		})
	}
	waitGroup.Wait()
	close(winners)
	count := 0
	for reservation := range winners {

		count++
		reservation.release()

	}

	if count != 1 {
		tester.Fatalf("got %d reservation owners, want 1", count)
	}

}
