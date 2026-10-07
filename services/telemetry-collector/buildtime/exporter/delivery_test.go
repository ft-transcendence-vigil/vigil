package exporter

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"go.opentelemetry.io/collector/consumer/consumererror"
	collexporter "go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/otel/metric"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

const deliveryID = "00000000-0000-4000-8000-000000000001"

var eventTime = time.Date(2026, 10, 4, 12, 0, 0, 0, time.UTC)

type fakeDeliveryStorage struct {

	events					[]string
	rows					[]byte
	insertErr, visibleErr	error
	visibleHook				func()
	count					int
	id, signal				string

}

func (storage *fakeDeliveryStorage) inserted(signal string, rows any) error {

	storage.events = append(storage.events, "insert:"+signal)
	storage.rows, _ = json.Marshal(rows)

	return storage.insertErr

}
func (storage *fakeDeliveryStorage) InsertLogs(_ context.Context, rows []LogRow) error {

	return storage.inserted("logs", rows)

}
func (storage *fakeDeliveryStorage) InsertMetrics(_ context.Context, rows []MetricRow) error {

	return storage.inserted("metrics", rows)

}
func (storage *fakeDeliveryStorage) InsertTraces(_ context.Context, rows []TraceRow) error {

	return storage.inserted("traces", rows)

}
func (storage *fakeDeliveryStorage) ConfirmVisible(_ context.Context, signal, id string, count int) error {

	storage.events = append(storage.events, "visible:"+signal)
	storage.signal, storage.id, storage.count = signal, id, count

	if storage.visibleHook != nil {
		storage.visibleHook()
	}

	return storage.visibleErr

}
func (storage *fakeDeliveryStorage) Close() error {

	return nil

}

type deliveryInput struct {

	consume		func(context.Context, *Exporter) error
	empty		func(context.Context, *Exporter) error
	invalid		func(context.Context, *Exporter) error
	attributes	[]pcommon.Map

}

func signalInput(signal string) deliveryInput {

	var result deliveryInput

	switch signal {

	case "logs":
		data := plog.NewLogs()
		for _, service := range []string{"b", "a", "b", "b"} {
			resource := data.ResourceLogs().AppendEmpty()
			resource.Resource().Attributes().PutStr("service.name", service)
			record		:= resource.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()
			timestamp	:= eventTime

			if len(result.attributes) >= 2 {
				timestamp = timestamp.Add(2 * time.Second)
			}

			record.SetTimestamp(pcommon.NewTimestampFromTime(timestamp))
			record.Body().SetStr("message")
			record.Attributes().PutStr("vigil.notification_id", "client-value")
			result.attributes = append(result.attributes, record.Attributes())
		}
		result.consume = func(ctx context.Context, exporter *Exporter) error {

			return exporter.ConsumeLogs(ctx, data)

		}
		result.empty = func(ctx context.Context, exporter *Exporter) error {

			return exporter.ConsumeLogs(ctx, plog.NewLogs())

		}
		result.invalid = func(ctx context.Context, exporter *Exporter) error {

			bad := plog.NewLogs()
			bad.ResourceLogs().AppendEmpty()
			return exporter.ConsumeLogs(ctx, bad)

		}

	case "metrics":
		data := pmetric.NewMetrics()
		for _, service := range []string{"b", "a", "b", "b"} {
			resource := data.ResourceMetrics().AppendEmpty()
			resource.Resource().Attributes().PutStr("service.name", service)
			metricData := resource.ScopeMetrics().AppendEmpty().Metrics().AppendEmpty()
			metricData.SetName("requests")
			point		:= metricData.SetEmptyGauge().DataPoints().AppendEmpty()
			timestamp	:= eventTime

			if len(result.attributes) >= 2 {
				timestamp = timestamp.Add(2 * time.Second)
			}

			point.SetTimestamp(pcommon.NewTimestampFromTime(timestamp))
			point.SetIntValue(42)
			point.Attributes().PutStr("vigil.notification_id", "client-value")
			result.attributes = append(result.attributes, point.Attributes())
		}
		result.consume = func(ctx context.Context, exporter *Exporter) error {

			return exporter.ConsumeMetrics(ctx, data)

		}
		result.empty = func(ctx context.Context, exporter *Exporter) error {

			return exporter.ConsumeMetrics(ctx, pmetric.NewMetrics())

		}
		result.invalid = func(ctx context.Context, exporter *Exporter) error {

			bad := pmetric.NewMetrics()
			bad.ResourceMetrics().AppendEmpty()
			return exporter.ConsumeMetrics(ctx, bad)

		}

	case "traces":
		data := ptrace.NewTraces()
		for _, service := range []string{"b", "a", "b", "b"} {
			resource := data.ResourceSpans().AppendEmpty()
			resource.Resource().Attributes().PutStr("service.name", service)
			span := resource.ScopeSpans().AppendEmpty().Spans().AppendEmpty()
			span.SetName("request")
			id := byte(len(result.attributes) + 1)

			if id > 3 {
				id = 3
			}

			span.SetTraceID(pcommon.TraceID{id})
			span.SetSpanID(pcommon.SpanID{id})
			timestamp := eventTime

			if len(result.attributes) >= 2 {
				timestamp = timestamp.Add(2 * time.Second)
			}

			span.SetStartTimestamp(pcommon.NewTimestampFromTime(timestamp))
			span.SetEndTimestamp(pcommon.NewTimestampFromTime(timestamp.Add(time.Millisecond)))
			span.Attributes().PutStr("vigil.notification_id", "client-value")
			result.attributes = append(result.attributes, span.Attributes())
		}
		result.consume = func(ctx context.Context, exporter *Exporter) error {

			return exporter.ConsumeTraces(ctx, data)

		}
		result.empty = func(ctx context.Context, exporter *Exporter) error {

			return exporter.ConsumeTraces(ctx, ptrace.NewTraces())

		}
		result.invalid = func(ctx context.Context, exporter *Exporter) error {

			bad := ptrace.NewTraces()
			bad.ResourceSpans().AppendEmpty()
			return exporter.ConsumeTraces(ctx, bad)

		}
	}

	return result

}
func deliveryExporter(tester *testing.T, handler http.HandlerFunc) (*Exporter, *fakeDeliveryStorage) {

	tester.Helper()

	server := httptest.NewServer(handler)

	tester.Cleanup(server.Close)

	config			:= &Config{ClickHouseEndpoint: "http://unused:8123", ClickHouseDatabase: "vigil", ClickHouseUsername: "writer", ClickHousePassword: "test", BackendCallbackURL: server.URL, MaxSerializedBatchBytes: 1_048_576, DedupWindow: time.Minute}
	exporter, err	:= newExporter(config, collexporter.Settings{})

	if err != nil { tester.Fatal(err) }

	storage := &fakeDeliveryStorage{}
	exporter.Storage = storage
	exporter.now = func() time.Time { return eventTime.Add(time.Hour) }
	exporter.newNotificationID = func() string { return deliveryID }
	exporter.wait = func(context.Context, time.Duration) error { return nil }
	tester.Cleanup(func() { _ = exporter.Shutdown(context.Background()) })

	return exporter, storage

}
func TestDeliverySignals(tester *testing.T) {

	for _, signal := range []string{"logs", "metrics", "traces"} {

		tester.Run(signal, func(tester *testing.T) {

			var metadata notification
			var callbackOrder []string
			var storage *fakeDeliveryStorage

			exporter, createdStorage := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

				callbackOrder = append([]string(nil), storage.events...)

				if request.Method != "POST" || request.Header.Get("Content-Type") != "application/json" {
					tester.Error("invalid request")
				}

				decoder := json.NewDecoder(request.Body)
				decoder.DisallowUnknownFields()

				if err := decoder.Decode(&metadata); err != nil {
					tester.Error(err)
				}

				responseWriter.WriteHeader(204)

			})
			storage	= createdStorage
			input	:= signalInput(signal)

			if err := input.empty(context.Background(), exporter); err != nil {
				tester.Fatal(err)
			}

			if len(storage.events) != 0 {
				tester.Fatal("empty input delivered")
			}

			if err := input.invalid(context.Background(), exporter); !consumererror.IsPermanent(err) {
				tester.Fatalf("conversion error: %v", err)
			}

			if len(storage.events) != 0 {
				tester.Fatal("invalid input delivered")
			}

			confirmed := eventTime.Add(2 * time.Hour)
			storage.visibleHook = func() {

				exporter.now = func() time.Time {

					return confirmed

				}

			}

			if err := input.consume(context.Background(), exporter); err != nil {
				tester.Fatal(err)
			}

			if !reflect.DeepEqual(callbackOrder, []string{"insert:" + signal, "visible:" + signal}) {

				tester.Fatalf("order: %v", callbackOrder)
			}

			if storage.count != 3 || storage.id != deliveryID || storage.signal != signal {
				tester.Fatalf("visibility: %+v", storage)
			}

			if metadata.NotificationID != deliveryID || metadata.SignalType != signal || !metadata.StoredAt.Equal(confirmed) {
				tester.Fatalf("metadata: %+v", metadata)
			}

			want := []notificationService{{"a", eventTime}, {"b", eventTime.Add(2 * time.Second)}}

			if !reflect.DeepEqual(metadata.Services, want) {
				tester.Fatalf("services: %+v", metadata.Services)
			}

			var rows []struct {

				Attributes	map[string]string	`json:"attributes"`

			}

			if err := json.Unmarshal(storage.rows, &rows); err != nil {
				tester.Fatal(err)
			}

			for _, row := range rows {

				if row.Attributes["vigil.notification_id"] != deliveryID {
					tester.Fatal("unstamped row")
				}

			}
			for _, attributes := range input.attributes {

				value, _ := attributes.Get("vigil.notification_id")

				if value.Str() != "client-value" {
					tester.Fatal("mutated input")
				}

			}

			if exporter.Capabilities().MutatesData {
				tester.Fatal("mutating capability")
			}

			if err := input.consume(context.Background(), exporter); err != nil {
				tester.Fatal(err)
			}

			if len(storage.events) != 2 {
				tester.Fatalf("duplicate delivery: %v", storage.events)
			}

		})

	}

}

func TestDeliveryFailuresAndRecovery(tester *testing.T) {

	for _, signal := range []string{"logs", "metrics", "traces"} {

		tester.Run(signal, func(tester *testing.T) {

			calls				:= 0
			exporter, storage	:= deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

				calls++
				responseWriter.WriteHeader(204)

			})
			input := signalInput(signal)
			exporter.Config.MaxSerializedBatchBytes = 1

			if err := input.consume(context.Background(), exporter); !consumererror.IsPermanent(err) {
				tester.Fatalf("oversize: %v", err)
			}

			if len(storage.events) != 0 || len(exporter.dedup.entries) != 0 {
				tester.Fatal("oversize reserved or inserted")
			}

			exporter.Config.MaxSerializedBatchBytes = 1_048_576
			storage.insertErr = errors.New("insert failed")

			if err := input.consume(context.Background(), exporter); err == nil || consumererror.IsPermanent(err) {
				tester.Fatalf("insert error: %v", err)
			}

			if len(exporter.dedup.entries) != 0 || calls != 0 {
				tester.Fatal("failed insert retained keys or callback")
			}

			storage.insertErr = nil
			storage.visibleErr = errors.New("not visible")

			if err := input.consume(context.Background(), exporter); err == nil {
				tester.Fatal("visibility error missing")
			}

			if calls != 0 || len(exporter.pending) != 1 {
				tester.Fatal("visibility failure lost metadata or sent callback")
			}

			exporter.now = func() time.Time {

				return eventTime.Add(24 * time.Hour)

			}

			if err := input.consume(context.Background(), exporter); err == nil {
				tester.Fatal("visibility retry error missing")
			}

			storage.visibleErr = nil

			if err := input.consume(context.Background(), exporter); err != nil {
				tester.Fatal(err)
			}

			if calls != 1 || len(exporter.pending) != 0 {
				tester.Fatal("recovery did not notify exactly once")
			}

			if !reflect.DeepEqual(storage.events, []string{"insert:" + signal, "insert:" + signal, "visible:" + signal, "visible:" + signal, "visible:" + signal}) {

				tester.Fatalf("reinsert on recovery: %v", storage.events)
			}

			if err := input.consume(context.Background(), exporter); err != nil {
				tester.Fatal(err)
			}

			if len(storage.events) != 5 {
				tester.Fatal("recovered dedup not refreshed")
			}

		})

	}

}

func TestSerializedByteBoundary(tester *testing.T) {

	exporter, storage := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

		responseWriter.WriteHeader(204)

	})
	input := signalInput("logs")
	// The input has four rows, including one duplicate; the bound is deliberately pre-dedup.
	row := LogRow{ServiceName: "b", Timestamp: eventTime, Severity: "unspecified", Message: "message", Attributes: map[string]string{"vigil.notification_id": deliveryID}}
	var body bytes.Buffer
	encoder := json.NewEncoder(&body)
	for _, service := range []string{"b", "a", "b", "b"} {
		row.ServiceName = service
		row.Attributes["service.name"] = service

		if body.Len() > 0 && service == "b" {
			row.Timestamp = eventTime.Add(2 * time.Second)
		}

		if err := encoder.Encode(row); err != nil {
			tester.Fatal(err)
		}

	}
	exporter.Config.MaxSerializedBatchBytes = body.Len() - 1

	if err := input.consume(context.Background(), exporter); !consumererror.IsPermanent(err) {
		tester.Fatalf("boundary rejection: %v", err)
	}

	if len(storage.events) != 0 {
		tester.Fatal("oversized insert")
	}

	exporter.Config.MaxSerializedBatchBytes++

	if err := input.consume(context.Background(), exporter); err != nil {
		tester.Fatalf("exact bound: %v", err)
	}

}

func TestPendingAndBusyDelivery(tester *testing.T) {

	exporter, storage := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

		responseWriter.WriteHeader(204)

	})
	input				:= signalInput("logs")
	key					:= logDedupKey(LogRow{ServiceName: "b", Timestamp: eventTime, Severity: "unspecified", Message: "message", Attributes: map[string]string{"service.name": "b", "vigil.notification_id": "client-value"}})
	reservation, _, err	:= exporter.dedup.reserve([]dedupKey{key}, exporter.now())

	if err != nil {
		tester.Fatal(err)
	}

	if err := input.consume(context.Background(), exporter); !errors.Is(err, errDedupInFlight) || consumererror.IsPermanent(err) {
		tester.Fatalf("pending duplicate: %v", err)
	}

	reservation.release()
	exporter.deliveryMu.Lock()

	if err := input.consume(context.Background(), exporter); !errors.Is(err, errDedupInFlight) {
		tester.Fatalf("busy: %v", err)
	}

	exporter.deliveryMu.Unlock()

	if len(storage.events) != 0 {
		tester.Fatal("pending/busy inserted")
	}

}

type counterRecorder struct {

	metric.Int64Counter
	count	int

}

func (counter *counterRecorder) Add(context.Context, int64, ...metric.AddOption) {

	counter.count++

}

func TestCallbackDeliveryRetries(tester *testing.T) {

	tests := []struct {

		name		string
		statuses	[]int
		attempts	int
		failed		bool

	}{

		{"success", []int{204}, 1, false}, {"bad-request", []int{400}, 1, true}, {"unexpected-success", []int{200}, 1, true}, {"redirect", []int{302}, 1, true}, {"recover", []int{500, 503, 204}, 3, false}, {"exhausted", []int{500, 500, 500}, 3, true},

	}
	for _, test := range tests {
		tester.Run(test.name, func(tester *testing.T) {

			var payloads [][]byte
			exporter, storage := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

				payload, _	:= io.ReadAll(request.Body)
				payloads	= append(payloads, payload)
				responseWriter.Header().Set("Location", "/redirected")
				responseWriter.WriteHeader(test.statuses[len(payloads)-1])

			})
			var delays []time.Duration
			exporter.wait = func(_ context.Context, delay time.Duration) error {

				delays = append(delays, delay)
				return nil

			}
			counter := &counterRecorder{}
			exporter.callbackFailures = counter
			core, logs := observer.New(zap.ErrorLevel)
			exporter.Settings.Logger = zap.New(core)
			input := signalInput("logs")

			if err := input.consume(context.Background(), exporter); err != nil {
				tester.Fatalf("callback caused export retry: %v", err)
			}

			if len(payloads) != test.attempts {
				tester.Fatalf("attempts: %d", len(payloads))
			}

			for _, payload := range payloads {

				if !bytes.Equal(payload, payloads[0]) {
					tester.Fatal("retry metadata changed")
				}

			}
			for i, delay := range delays {

				base := time.Second * time.Duration(1<<i)

				if delay < base || delay >= base+250*time.Millisecond {
					tester.Fatalf("backoff: %v", delay)
				}

			}
			wantFailures := 0

			if test.failed {
				wantFailures = 1
			}

			if counter.count != wantFailures || logs.Len() != wantFailures {
				tester.Fatalf("failure reporting: counter=%d logs=%d", counter.count, logs.Len())
			}

			if err := input.consume(context.Background(), exporter); err != nil {
				tester.Fatal(err)
			}

			if len(storage.events) != 2 || len(payloads) != test.attempts {
				tester.Fatal("callback failure repeated insert or callback")
			}

		})
	}

}

type transportFunc func(*http.Request) (*http.Response, error)

func (transport transportFunc) RoundTrip(request *http.Request) (*http.Response, error) {

	return transport(request)

}

func TestCallbackTransportErrors(tester *testing.T) {

	tests := []struct {

		name	string
		err		error

	}{{"network", io.ErrUnexpectedEOF}, {"timeout", context.DeadlineExceeded}}
	for _, test := range tests {
		tester.Run(test.name, func(tester *testing.T) {

			exporter, storage := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

				tester.Error("unexpected HTTP call")

			})
			attempts := 0
			var payloads [][]byte
			exporter.callbackClient.Transport = transportFunc(func(request *http.Request) (*http.Response, error) {

				deadline, ok := request.Context().Deadline()

				if !ok || time.Until(deadline) > 10*time.Second || time.Until(deadline) < 9*time.Second {
					tester.Error("missing 10-second attempt deadline")
				}

				payload, _	:= io.ReadAll(request.Body)
				payloads	= append(payloads, payload)
				attempts++
				return nil, test.err

			})

			if err := signalInput("logs").consume(context.Background(), exporter); err != nil {
				tester.Fatal(err)
			}

			if attempts != 3 || len(storage.events) != 2 {
				tester.Fatalf("attempts=%d events=%v", attempts, storage.events)
			}

			for _, payload := range payloads {

				if !bytes.Equal(payload, payloads[0]) {
					tester.Fatal("lost-response retry changed payload")
				}

			}

		})
	}

}

func TestCallbackCancellation(tester *testing.T) {

	exporter, _ := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

		responseWriter.WriteHeader(500)

	})
	ctx, cancel := context.WithCancel(context.Background())
	exporter.wait = func(ctx context.Context, _ time.Duration) error {

		cancel()
		return ctx.Err()

	}

	if err := signalInput("logs").consume(ctx, exporter); err != nil {
		tester.Fatal("callback cancellation retried inserted rows", err)
	}

	if err := waitForCallback(ctx, time.Hour); !errors.Is(err, context.Canceled) {
		tester.Fatal(err)
	}

}

func TestVisibilityRecoveryWithNewRows(tester *testing.T) {

	var notifications []notification
	exporter, storage := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

		var metadata notification

		if err := json.NewDecoder(request.Body).Decode(&metadata); err != nil {
			tester.Error(err)
		}

		notifications = append(notifications, metadata)
		responseWriter.WriteHeader(204)

	})
	storage.visibleErr = errors.New("not visible")

	if err := signalInput("logs").consume(context.Background(), exporter); err == nil {
		tester.Fatal("missing visibility error")
	}

	originalRows := append([]byte(nil), storage.rows...)
	storage.visibleErr = nil
	exporter.now = func() time.Time {

		return eventTime.Add(24 * time.Hour)

	}
	const secondID = "00000000-0000-4000-8000-000000000002"
	exporter.newNotificationID = func() string {

		return secondID

	}
	data		:= plog.NewLogs()
	resource	:= data.ResourceLogs().AppendEmpty()
	resource.Resource().Attributes().PutStr("service.name", "b")
	records := resource.ScopeLogs().AppendEmpty().LogRecords()
	for _, message := range []string{"message", "new message"} {
		record := records.AppendEmpty()
		record.SetTimestamp(pcommon.NewTimestampFromTime(eventTime))
		record.Body().SetStr(message)
		record.Attributes().PutStr("vigil.notification_id", "client-value")
	}

	if err := exporter.ConsumeLogs(context.Background(), data); err != nil {
		tester.Fatal(err)
	}

	if len(notifications) != 2 || notifications[0].NotificationID != deliveryID || notifications[1].NotificationID != secondID {
		tester.Fatalf("notifications: %+v", notifications)
	}

	if len(notifications[0].Services) != 2 || len(notifications[1].Services) != 1 {
		tester.Fatal("recovery metadata was replaced with retry subset")
	}

	var rows []LogRow

	if err := json.Unmarshal(storage.rows, &rows); err != nil {
		tester.Fatal(err)
	}

	if len(rows) != 1 || rows[0].Message != "new message" || bytes.Equal(storage.rows, originalRows) {
		tester.Fatal("reinserted original rows or omitted new row")
	}

}

func TestDeliveryExpiryNewNotification(tester *testing.T) {

	var ids []string
	exporter, storage := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

		var metadata notification
		_	= json.NewDecoder(request.Body).Decode(&metadata)
		ids	= append(ids, metadata.NotificationID)
		responseWriter.WriteHeader(204)

	})
	input := signalInput("metrics")

	if err := input.consume(context.Background(), exporter); err != nil {
		tester.Fatal(err)
	}

	exporter.now = func() time.Time {

		return eventTime.Add(2 * time.Hour)

	}
	exporter.newNotificationID = newNotificationID

	if err := input.consume(context.Background(), exporter); err != nil {
		tester.Fatal(err)
	}

	if len(storage.events) != 4 || len(ids) != 2 || ids[0] == ids[1] {
		tester.Fatalf("expiry: events=%v ids=%v", storage.events, ids)
	}

}

type meterRecorder struct {

	metric.Meter
	counter	*counterRecorder

}

func (recorder meterRecorder) Int64Counter(name string, _ ...metric.Int64CounterOption) (metric.Int64Counter, error) {

	if name != "vigil.exporter.callback.failures" {
		return nil, errors.New("unexpected counter name")
	}

	return recorder.counter, nil

}

type providerRecorder struct {

	metric.MeterProvider
	counter	*counterRecorder

}

func (provider providerRecorder) Meter(string, ...metric.MeterOption) metric.Meter {

	return meterRecorder{counter: provider.counter}

}
func TestCollectorCallbackCounter(tester *testing.T) {

	exporter, _ := deliveryExporter(tester, func(responseWriter http.ResponseWriter, request *http.Request) {

		responseWriter.WriteHeader(400)

	})

	counter		:= &counterRecorder{}
	settings	:= collexporter.Settings{}

	settings.MeterProvider = providerRecorder{counter: counter}

	instance, err := newExporter(exporter.Config, settings)

	if err != nil {
		tester.Fatal(err)
	}

	defer instance.Shutdown(context.Background())
	instance.Storage = &fakeDeliveryStorage{}
	instance.now = exporter.now

	if err := signalInput("traces").consume(context.Background(), instance); err != nil {
		tester.Fatal(err)
	}

	if counter.count != 1 {
		tester.Fatalf("collector counter: %d", counter.count)
	}

}
