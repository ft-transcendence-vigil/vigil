// Package exporter implements the Vigil OpenTelemetry Collector exporter for ClickHouse
// and sends a backend notification after each stored batch becomes queryable.
package exporter

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
	"sync"

	"go.opentelemetry.io/collector/consumer/consumererror"
	"go.opentelemetry.io/otel/metric"
	"time"

	collcomponent "go.opentelemetry.io/collector/component"
	collconsumer "go.opentelemetry.io/collector/consumer"
	collexporter "go.opentelemetry.io/collector/exporter"
	collplog "go.opentelemetry.io/collector/pdata/plog"
	collpmetric "go.opentelemetry.io/collector/pdata/pmetric"
	collptrace "go.opentelemetry.io/collector/pdata/ptrace"
)

// Exporter holds one Collector signal consumer, its external clients, and its delivery state.
// deliveryMu guards pending deliveries and serializes delivery on this instance.
// The clock, ID generator, and wait function can be replaced in tests.
type Exporter struct {

	Config				*Config
	Settings			collexporter.Settings
	Storage				Storage
	dedup				*deduplicator
	now					func() time.Time
	newNotificationID	func() string
	deliveryMu			sync.Mutex
	pending				[]*pendingDelivery
	callbackClient		*http.Client
	wait				func(context.Context, time.Duration) error
	callbackFailures	metric.Int64Counter

}

// Start satisfies the Collector lifecycle. The clients connect on demand during delivery.
func (exporter *Exporter) Start(ctx context.Context, _ collcomponent.Host) error {

	return nil

}

// Shutdown closes idle callback connections and releases the storage client.
func (exporter *Exporter) Shutdown(ctx context.Context) error {

	if exporter.callbackClient != nil {
		exporter.callbackClient.CloseIdleConnections()
	}

	if exporter.Storage != nil {
		return exporter.Storage.Close()
	}

	return nil

}

// Capabilities reports that conversion leaves the Collector-owned input unchanged.
func (exporter *Exporter) Capabilities() collconsumer.Capabilities {

	return collconsumer.Capabilities{}

}

// ConsumeLogs validates and flattens logs, then hands their identity and storage mapping
// to the shared delivery path. Invalid input is a permanent consumer error.
func (exporter *Exporter) ConsumeLogs(ctx context.Context, incomingLogs collplog.Logs) error {

	rows, err := logsToRows(incomingLogs)

	if err != nil {
		return consumererror.NewPermanent(err)
	}

	// []LogRow determines T. The anonymous function extracts the row fields and
	// the bound InsertLogs method carries the current Storage as its receiver.
	return deliver(ctx, exporter, "logs", rows, logDedupKey, func(row LogRow) (string, time.Time, map[string]string) {

		return row.ServiceName, row.Timestamp, row.Attributes

	}, exporter.Storage.InsertLogs)

}

// ConsumeMetrics flattens metric points and delivers them with metric-specific dedup keys.
func (exporter *Exporter) ConsumeMetrics(ctx context.Context, incomingMetrics collpmetric.Metrics) error {

	rows, err := metricsToRows(incomingMetrics)

	if err != nil {
		return consumererror.NewPermanent(err)
	}

	return deliver(ctx, exporter, "metrics", rows, metricDedupKey, func(row MetricRow) (string, time.Time, map[string]string) {

		return row.ServiceName, row.Timestamp, row.Attributes

	}, exporter.Storage.InsertMetrics)

}

// ConsumeTraces flattens spans and delivers them with identity based on trace and span IDs.
func (exporter *Exporter) ConsumeTraces(ctx context.Context, incomingTraces collptrace.Traces) error {

	rows, err := tracesToRows(incomingTraces)

	if err != nil {
		return consumererror.NewPermanent(err)
	}

	return deliver(ctx, exporter, "traces", rows, traceDedupKey, func(row TraceRow) (string, time.Time, map[string]string) {

		return row.ServiceName, row.Timestamp, row.Attributes

	}, exporter.Storage.InsertTraces)

}

// newExporter validates settings, wires the production clients, and registers the callback
// failure counter when the Collector supplies a meter provider.
func newExporter(config *Config, settings collexporter.Settings) (*Exporter, error) {

	if config == nil {
		return nil, fmt.Errorf("exporter config is required")
	}

	if err := config.Validate(); err != nil {
		return nil, err
	}

	instance := &Exporter{

		Config:				config,
		Settings:			settings,
		Storage:			newClickHouseStorage(config),
		dedup:				newDeduplicator(config.DedupWindow),
		now:				time.Now,
		newNotificationID:	newNotificationID,

	}
	// Expose redirects as responses so the callback only posts to the configured URL.
	instance.callbackClient = &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error {

		return http.ErrUseLastResponse

	}}
	instance.wait = waitForCallback
	if settings.MeterProvider != nil {
		counter, err := settings.MeterProvider.Meter("vigilclickhouse").Int64Counter("vigil.exporter.callback.failures")

		if err != nil {
			return nil, fmt.Errorf("create callback failure counter: %w", err)
		}

		instance.callbackFailures = counter
	}
	return instance, nil

}

func newNotificationID() string {

	var id [16]byte

	rand.Read(id[:])

	// & clears the version and variant bits. | sets them to 0100 and 10 respectively.
	id[6] = (id[6] & 0x0f) | 0x40
	id[8] = (id[8] & 0x3f) | 0x80

	return fmt.Sprintf("%x-%x-%x-%x-%x", id[:4], id[4:6], id[6:8], id[8:10], id[10:])

}
