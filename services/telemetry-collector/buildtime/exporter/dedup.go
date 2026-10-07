package exporter

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"sync"
	"time"
)

type dedupKey [sha256.Size]byte

var errDedupInFlight = errors.New("matching telemetry is awaiting storage; retry export")

type dedupEntry struct {

	pending		bool
	expiresAt	time.Time

}

type deduplicator struct {

	mu		sync.Mutex
	entries	map[dedupKey]dedupEntry
	window	time.Duration

}

type dedupReservation struct {

	owner	*deduplicator
	keys	[]dedupKey
	done	bool

}

func newDeduplicator(window time.Duration) *deduplicator {

	return &deduplicator{entries: make(map[dedupKey]dedupEntry), window: window}

}

func (deduplicator *deduplicator) reserve(keys []dedupKey, now time.Time) (*dedupReservation, []int, error) {

	deduplicator.mu.Lock()
	defer deduplicator.mu.Unlock()

	for key, entry := range deduplicator.entries {

		if !entry.pending && !now.Before(entry.expiresAt) {
			delete(deduplicator.entries, key)
		}

	}

	for _, key := range keys {

		if entry, found := deduplicator.entries[key]; found && entry.pending {
			return nil, nil, errDedupInFlight
		}

	}

	reservation := &dedupReservation{owner: deduplicator}

	var retained []int

	for index, key := range keys {

		if _, found := deduplicator.entries[key]; found {
			continue
		}

		deduplicator.entries[key] = dedupEntry{pending: true}
		reservation.keys = append(reservation.keys, key)
		retained = append(retained, index)

	}

	return reservation, retained, nil

}

func (reservation *dedupReservation) commit(now time.Time) {

	reservation.owner.mu.Lock()
	defer reservation.owner.mu.Unlock()

	if reservation.done {
		return
	}

	for _, key := range reservation.keys {
		reservation.owner.entries[key] = dedupEntry{expiresAt: now.Add(reservation.owner.window)}
	}

	reservation.done = true

}

func (reservation *dedupReservation) release() {

	reservation.owner.mu.Lock()
	defer reservation.owner.mu.Unlock()

	if reservation.done {
		return
	}

	for _, key := range reservation.keys {
		delete(reservation.owner.entries, key)
	}
	reservation.done = true

}

func keyFrom(value any) dedupKey {

	data, _ := json.Marshal(value)
	return sha256.Sum256(data)

}

func logDedupKey(row LogRow) dedupKey {

	return keyFrom(struct {

		Signal	string
		Row		LogRow

	}{"logs", row})

}

func metricDedupKey(row MetricRow) dedupKey {

	return keyFrom(struct {

		Signal			string
		SeriesID		string
		Timestamp		time.Time
		StartTimestamp	*time.Time
		Payload			string

	}{"metrics", row.SeriesID, row.Timestamp, row.StartTimestamp, row.DedupPayload})

}

func traceDedupKey(row TraceRow) dedupKey {

	return keyFrom(struct {

		Signal	string
		TraceID	string
		SpanID	string

	}{"traces", row.TraceID, row.SpanID})

}
