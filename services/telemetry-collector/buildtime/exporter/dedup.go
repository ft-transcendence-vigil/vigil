package exporter

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"sync"
	"time"
)

// A dedupKey is a SHA-256 digest of the identity fields for one telemetry row.
type dedupKey [sha256.Size]byte

var errDedupInFlight = errors.New("matching telemetry is awaiting storage; retry export")

// A pending entry belongs to an active insert reservation. A committed entry expires
// after the configured deduplication window.
type dedupEntry struct {

	pending		bool
	expiresAt	time.Time

}

// deduplicator tracks recent identities in process memory. mu protects entries
// and the done flag of reservations owned by this deduplicator.
type deduplicator struct {

	mu		sync.Mutex
	entries	map[dedupKey]dedupEntry
	window	time.Duration

}

// dedupReservation owns the newly accepted keys until storage succeeds or fails.
type dedupReservation struct {

	owner	*deduplicator
	keys	[]dedupKey
	done	bool

}

func newDeduplicator(window time.Duration) *deduplicator {

	return &deduplicator{entries: make(map[dedupKey]dedupEntry), window: window}

}

// reserve prunes expired entries, skips committed duplicates, and returns the indices
// of each newly claimed row. A pending conflict rejects the reservation as a whole.
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

	// Claim keys after the conflict scan so a blocked batch makes no partial reservation.
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

// commit starts the retention window after an accepted insert.
func (reservation *dedupReservation) commit(now time.Time) {

	// Use the owner's lock so commit and release update the map and done together.
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

// release frees uncommitted keys so a later attempt can claim them again.
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

// logDedupKey uses the entire normalized log row before delivery stamps its notification ID.
func logDedupKey(row LogRow) dedupKey {

	// An anonymous struct defines the exact fields JSON encodes before hashing.
	return keyFrom(struct {

		Signal	string
		Row		LogRow

	}{"logs", row})

}

// metricDedupKey identifies a point by series, timestamps, and normalized payload.
func metricDedupKey(row MetricRow) dedupKey {

	return keyFrom(struct {

		Signal			string
		SeriesID		string
		Timestamp		time.Time
		StartTimestamp	*time.Time
		Payload			string

	}{"metrics", row.SeriesID, row.Timestamp, row.StartTimestamp, row.DedupPayload})

}

// traceDedupKey keeps the same identity when a retry changes other span fields.
func traceDedupKey(row TraceRow) dedupKey {

	return keyFrom(struct {

		Signal	string
		TraceID	string
		SpanID	string

	}{"traces", row.TraceID, row.SpanID})

}
