package exporter

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	collexporter "go.opentelemetry.io/collector/exporter"
)

func TestClickHouseStorageInsert(tester *testing.T) {

	for _, signal := range []string{"logs", "metrics", "traces"} {

		tester.Run(signal, func(tester *testing.T) {

			calls	:= 0
			server	:= httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {

				calls++
				parameters := request.URL.Query()

				if request.Method != http.MethodPost || parameters.Get("query") != "INSERT INTO "+signal+" FORMAT JSONEachRow" {
					tester.Error("unexpected insert request")
				}

				if parameters.Get("database") != "vigil" || parameters.Get("async_insert") != "0" || parameters.Get("wait_end_of_query") != "1" || parameters.Get("date_time_input_format") != "best_effort" {
					tester.Error("missing synchronous insert settings")
				}

				if request.Header.Get("X-ClickHouse-User") != "writer" || request.Header.Get("X-ClickHouse-Key") != "test-password" {
					tester.Error("missing authentication")
				}

				decoder := json.NewDecoder(request.Body)
				for range 2 {

					var row map[string]any
					if err := decoder.Decode(&row); err != nil {
						tester.Error(err)
						return
					}

					if row["service"] != "api" || row["timestamp"] != "2026-10-03T10:00:00.123Z" {
						tester.Errorf("unexpected row: %#v", row)
					}

					if attributes, ok := row["attributes"].(map[string]any); !ok || attributes["vigil.notification_id"] != "notification" {
						tester.Error("missing notification ID")
					}

				}
				var extra any

				if err := decoder.Decode(&extra); err != io.EOF {
					tester.Error("unexpected extra rows")
				}

			}))
			defer server.Close()

			storage := newClickHouseStorage(&Config{ClickHouseEndpoint: server.URL, ClickHouseDatabase: "vigil", ClickHouseUsername: "writer", ClickHousePassword: "test-password"})
			defer storage.Close()
			timestamp	:= time.Date(2026, 10, 3, 10, 0, 0, 123_000_000, time.UTC)
			attributes	:= map[string]string{"vigil.notification_id": "notification"}

			var err error
			switch signal {

			case "logs":
				row	:= LogRow{ServiceName: "api", Timestamp: timestamp, Attributes: attributes}
				err	= storage.InsertLogs(context.Background(), []LogRow{row, row})
			case "metrics":
				row	:= MetricRow{ServiceName: "api", Timestamp: timestamp, Attributes: attributes, Value: float64Pointer(1.25), MetricType: "gauge", AggregationTemporality: "unspecified", SeriesID: "series"}
				err	= storage.InsertMetrics(context.Background(), []MetricRow{row, row})
			case "traces":
				row	:= TraceRow{ServiceName: "api", Timestamp: timestamp, Attributes: attributes}
				err	= storage.InsertTraces(context.Background(), []TraceRow{row, row})

			}

			if err != nil {
				tester.Fatal(err)
			}

			if calls != 1 {
				tester.Fatalf("got %d inserts", calls)
			}

		})

	}

}

func TestClickHouseStorageVisibility(tester *testing.T) {

	for _, test := range []struct {

		name	string
		status	int
		body	string
		invalid	bool

	}{

		{"visible", 200, "2\n", false},
		{"missing", 200, "1\n", true},
		{"extra", 200, "3\n", true},
		{"malformed", 200, "not a count", true},
		{"failed", 500, "private details", true},

	} {

		tester.Run(test.name, func(tester *testing.T) {

			server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {

				if !strings.Contains(request.URL.Query().Get("query"), "FROM logs WHERE") || request.URL.Query().Get("param_notification_id") != "notification" {
					tester.Error("unexpected visibility query")
				}

				writer.WriteHeader(test.status)
				io.WriteString(writer, test.body)

			}))
			defer server.Close()

			storage := newClickHouseStorage(&Config{ClickHouseEndpoint: server.URL})
			defer storage.Close()

			err := storage.ConfirmVisible(context.Background(), "logs", "notification", 2)

			if (err != nil) != test.invalid {
				tester.Fatalf("unexpected error: %v", err)
			}

			if err != nil && strings.Contains(err.Error(), "private details") {
				tester.Fatal("exposed server response")
			}

		})

	}

}

func TestClickHouseStorageFailures(tester *testing.T) {

	calls		:= 0
	response	:= ""
	status		:= http.StatusOK
	server		:= httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {

		calls++
		writer.WriteHeader(status)
		io.WriteString(writer, response)

	}))
	defer server.Close()

	storage := newClickHouseStorage(&Config{ClickHouseEndpoint: server.URL})
	defer storage.Close()

	if err := storage.InsertLogs(context.Background(), nil); err != nil {
		tester.Fatal(err)
	}

	if err := storage.InsertMetrics(context.Background(), nil); err != nil {
		tester.Fatal(err)
	}

	if err := storage.InsertTraces(context.Background(), nil); err != nil {
		tester.Fatal(err)
	}

	nan := math.NaN()

	if err := storage.InsertMetrics(context.Background(), []MetricRow{{Value: &nan}}); err == nil {

		tester.Fatal("expected encoding error")
	}

	if err := storage.ConfirmVisible(context.Background(), "invalid", "id", 1); err == nil {
		tester.Fatal("expected signal error")
	}

	if err := storage.ConfirmVisible(context.Background(), "logs", "", 1); err == nil {
		tester.Fatal("expected notification error")
	}

	if err := storage.ConfirmVisible(context.Background(), "logs", "id", 0); err == nil {
		tester.Fatal("expected count error")
	}

	if calls != 0 {
		tester.Fatal("invalid/empty inputs made requests")
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if err := storage.InsertLogs(ctx, []LogRow{{}}); !errors.Is(err, context.Canceled) {

		tester.Fatalf("expected cancellation, got %v", err)
	}

	status = http.StatusInternalServerError

	if err := storage.InsertLogs(context.Background(), []LogRow{{}}); err == nil {

		tester.Fatal("expected insert failure")
	}
	status		= http.StatusOK
	response	= "Code: 123. late query error"

	if err := storage.InsertLogs(context.Background(), []LogRow{{}}); err == nil {

		tester.Fatal("expected late insert failure")
	}

}

func TestNewExporterStorage(tester *testing.T) {

	config := &Config{

		ClickHouseEndpoint:			"http://clickhouse:8123",
		ClickHouseDatabase:			"vigil",
		ClickHouseUsername:			"writer",
		ClickHousePassword:			"test-password",
		BackendCallbackURL:			"http://backend:8081/internal/alerts/trigger-evaluation",
		MaxSerializedBatchBytes:	1_048_576,
		DedupWindow:				10 * time.Minute,

	}

	instance, err := newExporter(config, collexporter.Settings{})

	if err != nil {
		tester.Fatal(err)
	}

	if instance.Config != config || instance.Storage == nil {
		tester.Fatal("exporter dependencies missing")
	}

	if err := instance.Shutdown(context.Background()); err != nil {
		tester.Fatal(err)
	}

	if _, err := newExporter(nil, collexporter.Settings{}); err == nil {
		tester.Fatal("expected nil config error")
	}
	if _, err := newExporter(&Config{}, collexporter.Settings{}); err == nil {
		tester.Fatal("expected invalid config error")
	}

}
