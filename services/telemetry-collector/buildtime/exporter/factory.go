package exporter

import (
	"context"
	collcomponent "go.opentelemetry.io/collector/component"
	collexporter "go.opentelemetry.io/collector/exporter"
	"time"
)

// NewFactory registers vigilclickhouse as a Collector exporter for logs, metrics, and traces.
func NewFactory() collexporter.Factory {

	return collexporter.NewFactory(
		collcomponent.MustNewType("vigilclickhouse"),
		createDefaultConfig,
		collexporter.WithLogs(createLogs, collcomponent.StabilityLevelDevelopment),
		collexporter.WithMetrics(createMetrics, collcomponent.StabilityLevelDevelopment),
		collexporter.WithTraces(createTraces, collcomponent.StabilityLevelDevelopment),
	)

}

// createDefaultConfig supplies the byte limit and deduplication window. Deployment
// configuration provides the ClickHouse connection details and backend callback URL.
func createDefaultConfig() collcomponent.Config {

	return &Config{

		MaxSerializedBatchBytes:	1_048_576,
		DedupWindow:				10 * time.Minute,

	}

}

// Each factory receives a component.Config interface containing the *Config
// from createDefaultConfig. The type assertion extracts that pointer.
func createLogs(ctx context.Context, settings collexporter.Settings, config collcomponent.Config) (collexporter.Logs, error) {

	return newExporter(config.(*Config), settings)

}

func createMetrics(ctx context.Context, settings collexporter.Settings, config collcomponent.Config) (collexporter.Metrics, error) {

	return newExporter(config.(*Config), settings)

}

func createTraces(ctx context.Context, settings collexporter.Settings, config collcomponent.Config) (collexporter.Traces, error) {

	return newExporter(config.(*Config), settings)

}
