package exporter

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	collplog "go.opentelemetry.io/collector/pdata/plog"
	collpmetric "go.opentelemetry.io/collector/pdata/pmetric"
	collptrace "go.opentelemetry.io/collector/pdata/ptrace"
)

type LogRow struct {

	ServiceName	string				`json:"service"`
	Timestamp	time.Time			`json:"timestamp"`
	Severity	string				`json:"severity"`
	Attributes	map[string]string	`json:"attributes"`
	Message		string				`json:"message"`

}

type MetricRow struct {

	ServiceName				string				`json:"service"`
	Timestamp				time.Time			`json:"timestamp"`
	Name					string				`json:"name"`
	Value					*float64			`json:"value"`
	MetricType				string				`json:"metric_type"`
	Unit					string				`json:"unit"`
	AggregationTemporality	string				`json:"aggregation_temporality"`
	IsMonotonic				*bool				`json:"is_monotonic"`
	StartTimestamp			*time.Time			`json:"start_timestamp"`
	SeriesID				string				`json:"series_id"`
	HistogramSum			*float64			`json:"histogram_sum"`
	HistogramCount			*uint64				`json:"histogram_count"`
	Attributes				map[string]string	`json:"attributes"`
	DedupPayload			string				`json:"-"`

}

type TraceRow struct {

	TraceID			string				`json:"trace_id"`
	SpanID			string				`json:"span_id"`
	ParentSpanID	*string				`json:"parent_span_id"`
	Name			string				`json:"name"`
	ServiceName		string				`json:"service"`
	Timestamp		time.Time			`json:"timestamp"`
	DurationMS		uint32				`json:"duration_ms"`
	Status			string				`json:"status"`
	Attributes		map[string]string	`json:"attributes"`

}

func logsToRows(logs collplog.Logs) ([]LogRow, error) {

	rows := make([]LogRow, 0, logs.LogRecordCount())

	for _, resourceLogs := range logs.ResourceLogs().All() {

		attributes						:= resourceLogs.Resource().Attributes()

		serviceName, serviceNameExists	:= attributes.Get("service.name")

		if !serviceNameExists {
			return nil, fmt.Errorf("log resource has no service.name")
		}

		if serviceName.Type() != pcommon.ValueTypeStr || strings.TrimSpace(serviceName.Str()) == "" {

			return nil, fmt.Errorf("log service.name must be a nonempty string")

		}

		for _, scopeLogs := range resourceLogs.ScopeLogs().All() {

			for _, record := range scopeLogs.LogRecords().All() {

				if record.Timestamp() == 0 {
					return nil, fmt.Errorf("log record has no timestamp")
				}

				rows = append(rows, LogRow{

					ServiceName:	serviceName.Str(),
					Timestamp:		record.Timestamp().AsTime().UTC().Truncate(time.Millisecond),
					Severity:		normalizeSeverity(record),
					Message:		record.Body().AsString(),
					Attributes:		mergeAttributes(attributes.AsRaw(), record.Attributes()),

				})

			}

		}

	}

	return rows, nil

}

func metricsToRows(metrics collpmetric.Metrics) ([]MetricRow, error) {

	rows := make([]MetricRow, 0, metrics.DataPointCount())
	for _, resourceMetrics := range metrics.ResourceMetrics().All() {

		resourceAttributes	:= resourceMetrics.Resource().Attributes()
		serviceName, ok		:= resourceAttributes.Get("service.name")

		if !ok {
			return nil, fmt.Errorf("metric resource has no service.name")
		}

		if serviceName.Type() != pcommon.ValueTypeStr || strings.TrimSpace(serviceName.Str()) == "" {
			return nil, fmt.Errorf("metric service.name must be a nonempty string")
		}

		for _, scopeMetrics := range resourceMetrics.ScopeMetrics().All() {

			scope := scopeMetrics.Scope()
			for _, metric := range scopeMetrics.Metrics().All() {

				if strings.TrimSpace(metric.Name()) == "" {
					return nil, fmt.Errorf("metric name must not be empty")
				}

				metricType, temporality, monotonic	:= metricMetadata(metric)
				seriesBase							:= map[string]any{
					"service": serviceName.Str(), "resource_attributes": resourceAttributes.AsRaw(),
					"scope_name": scope.Name(), "scope_version": scope.Version(), "scope_attributes": scope.Attributes().AsRaw(),
					"name": metric.Name(), "unit": metric.Unit(), "metric_type": metricType,
					"aggregation_temporality": temporality,
				}

				if monotonic != nil {
					seriesBase["is_monotonic"] = *monotonic
				}

				switch metric.Type() {
				case collpmetric.MetricTypeGauge, collpmetric.MetricTypeSum:
					var points collpmetric.NumberDataPointSlice

					if metric.Type() == collpmetric.MetricTypeGauge {
						points = metric.Gauge().DataPoints()
					} else {
						points = metric.Sum().DataPoints()
					}
					for _, point := range points.All() {

						if point.Timestamp() == 0 || point.Flags().NoRecordedValue() {
							return nil, fmt.Errorf("metric %q has no recorded value or timestamp", metric.Name())
						}

						value, err := numericValue(point, metric.Name())

						if err != nil {
							return nil, err
						}

						payload	:= map[string]any{"value": value, "attributes": point.Attributes().AsRaw()}
						rows	= append(rows, newMetricRow(serviceName.Str(), metric, seriesBase, point.Timestamp(), point.StartTimestamp(), point.Attributes(), monotonic, &value, nil, nil, payload))

					}
				case collpmetric.MetricTypeHistogram:
					for _, point := range metric.Histogram().DataPoints().All() {

						if point.Timestamp() == 0 || point.Flags().NoRecordedValue() {
							return nil, fmt.Errorf("metric %q has no recorded value or timestamp", metric.Name())
						}

						count := point.Count()
						var sum *float64
						if point.HasSum() {
							value := point.Sum()

							if !finite(value) {
								return nil, fmt.Errorf("metric %q histogram sum must be finite", metric.Name())
							}

							sum = &value
						}
						payload	:= map[string]any{"count": count, "sum": sum, "bucket_counts": point.BucketCounts().AsRaw(), "explicit_bounds": point.ExplicitBounds().AsRaw(), "attributes": point.Attributes().AsRaw()}
						rows	= append(rows, newMetricRow(serviceName.Str(), metric, seriesBase, point.Timestamp(), point.StartTimestamp(), point.Attributes(), nil, nil, sum, &count, payload))

					}
				case collpmetric.MetricTypeExponentialHistogram:
					for _, point := range metric.ExponentialHistogram().DataPoints().All() {

						if point.Timestamp() == 0 || point.Flags().NoRecordedValue() {
							return nil, fmt.Errorf("metric %q has no recorded value or timestamp", metric.Name())
						}

						count := point.Count()
						var sum *float64
						if point.HasSum() {
							value := point.Sum()

							if !finite(value) {
								return nil, fmt.Errorf("metric %q histogram sum must be finite", metric.Name())
							}

							sum = &value
						}
						payload	:= map[string]any{"count": count, "sum": sum, "scale": point.Scale(), "zero_count": point.ZeroCount(), "zero_threshold": point.ZeroThreshold(), "positive_offset": point.Positive().Offset(), "positive_buckets": point.Positive().BucketCounts().AsRaw(), "negative_offset": point.Negative().Offset(), "negative_buckets": point.Negative().BucketCounts().AsRaw(), "attributes": point.Attributes().AsRaw()}
						rows	= append(rows, newMetricRow(serviceName.Str(), metric, seriesBase, point.Timestamp(), point.StartTimestamp(), point.Attributes(), nil, nil, sum, &count, payload))

					}
				default:
					return nil, fmt.Errorf("metric %q has unsupported type %s", metric.Name(), metric.Type())
				}

			}

		}

	}
	return rows, nil

}

func metricMetadata(metric collpmetric.Metric) (string, string, *bool) {

	switch metric.Type() {
	case collpmetric.MetricTypeGauge:
		return "gauge", "unspecified", nil
	case collpmetric.MetricTypeSum:
		monotonic := metric.Sum().IsMonotonic()
		return "sum", temporalityName(metric.Sum().AggregationTemporality()), &monotonic
	case collpmetric.MetricTypeHistogram:
		return "histogram", temporalityName(metric.Histogram().AggregationTemporality()), nil
	case collpmetric.MetricTypeExponentialHistogram:
		return "exponential_histogram", temporalityName(metric.ExponentialHistogram().AggregationTemporality()), nil
	default:
		return "unknown", "unspecified", nil
	}

}

func temporalityName(value collpmetric.AggregationTemporality) string {

	switch value {
	case collpmetric.AggregationTemporalityDelta:
		return "delta"
	case collpmetric.AggregationTemporalityCumulative:
		return "cumulative"
	default:
		return "unspecified"
	}

}

func numericValue(point collpmetric.NumberDataPoint, name string) (float64, error) {

	var value float64
	switch point.ValueType() {
	case collpmetric.NumberDataPointValueTypeInt:
		integer := point.IntValue()

		if integer > 1<<53 || integer < -(1<<53) {
			return 0, fmt.Errorf("metric %q integer is outside the exact Float64 range", name)
		}

		value = float64(integer)
	case collpmetric.NumberDataPointValueTypeDouble:
		value = point.DoubleValue()
	default:
		return 0, fmt.Errorf("metric %q has no numeric value", name)
	}

	if !finite(value) {
		return 0, fmt.Errorf("metric %q value must be finite", name)
	}

	return value, nil

}

func finite(value float64) bool {

	return !math.IsNaN(value) && !math.IsInf(value, 0)

}

func newMetricRow(service string, metric collpmetric.Metric, seriesBase map[string]any, timestamp, start pcommon.Timestamp, pointAttributes pcommon.Map, monotonic *bool, value, histogramSum *float64, histogramCount *uint64, payload any) MetricRow {

	series := make(map[string]any, len(seriesBase)+1)
	for key, item := range seriesBase {
		series[key] = item
	}
	series["point_attributes"] = pointAttributes.AsRaw()
	var startTime *time.Time
	if start != 0 {
		converted	:= start.AsTime().UTC().Truncate(time.Millisecond)
		startTime	= &converted
	}
	return MetricRow{

		ServiceName:	service, Timestamp: timestamp.AsTime().UTC().Truncate(time.Millisecond), Name: metric.Name(), Value: value,
		MetricType:		seriesBase["metric_type"].(string), Unit: metric.Unit(), AggregationTemporality: seriesBase["aggregation_temporality"].(string),
		IsMonotonic:	monotonic, StartTimestamp: startTime, SeriesID: stableHash(series), HistogramSum: histogramSum, HistogramCount: histogramCount,
		Attributes:		mergeAttributes(seriesBase["resource_attributes"].(map[string]any), pointAttributes), DedupPayload: stableHash(payload),

	}

}

func stableHash(value any) string {

	encoded, err := json.Marshal(value)

	if err != nil {
		panic(fmt.Sprintf("canonical metric metadata: %v", err))
	}

	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])

}

func tracesToRows(traces collptrace.Traces) ([]TraceRow, error) {

	rows := make([]TraceRow, 0, traces.SpanCount())

	for _, resourceSpans := range traces.ResourceSpans().All() {

		attributes						:= resourceSpans.Resource().Attributes()

		serviceName, serviceNameExists	:= attributes.Get("service.name")

		if !serviceNameExists {
			return nil, fmt.Errorf("trace resource has no service.name")
		}

		if serviceName.Type() != pcommon.ValueTypeStr || strings.TrimSpace(serviceName.Str()) == "" {

			return nil, fmt.Errorf("trace service.name must be a nonempty string")

		}

		for _, scopeSpans := range resourceSpans.ScopeSpans().All() {

			for _, span := range scopeSpans.Spans().All() {

				if span.TraceID().IsEmpty() || span.SpanID().IsEmpty() || strings.TrimSpace(span.Name()) == "" {
					return nil, fmt.Errorf("span must have trace ID, span ID, and name")
				}

				start, end := span.StartTimestamp(), span.EndTimestamp()

				if start == 0 || end == 0 || end < start {

					return nil, fmt.Errorf("span %q has missing or reversed timestamps", span.Name())

				}

				// Subtract unsigned nanoseconds to avoid time.Duration overflow.
				duration := uint64(end) - uint64(start)

				if duration >= (uint64(math.MaxUint32)+1)*uint64(time.Millisecond) {

					return nil, fmt.Errorf("span %q duration exceeds UInt32 milliseconds", span.Name())

				}

				var parentSpanID *string
				if !span.ParentSpanID().IsEmpty() {

					parent			:= span.ParentSpanID().String()
					parentSpanID	= &parent

				}

				var status string
				switch span.Status().Code() {

				case collptrace.StatusCodeUnset:
					status = "unset"
				case collptrace.StatusCodeOk:
					status = "ok"
				case collptrace.StatusCodeError:
					status = "error"
				default:
					return nil, fmt.Errorf("span %q has invalid status", span.Name())

				}

				rows = append(rows, TraceRow{

					TraceID:		span.TraceID().String(),
					SpanID:			span.SpanID().String(),
					ParentSpanID:	parentSpanID,
					Name:			span.Name(),
					ServiceName:	serviceName.Str(),
					Timestamp:		start.AsTime().UTC().Truncate(time.Millisecond),
					DurationMS:		uint32(duration / uint64(time.Millisecond)),
					Status:			status,
					Attributes:		mergeAttributes(attributes.AsRaw(), span.Attributes()),

				})

			}

		}

	}

	return rows, nil

}

func normalizeSeverity(record collplog.LogRecord) string {

	severity := record.SeverityNumber()
	if severity >= collplog.SeverityNumberTrace && severity <= collplog.SeverityNumberFatal4 {

		labels := [...]string{"trace", "debug", "info", "warning", "error", "critical"}
		return labels[(int(severity)-1)/4]

	}

	switch strings.ToUpper(strings.TrimSpace(record.SeverityText())) {

	case "TRACE":
		return "trace"
	case "DEBUG":
		return "debug"
	case "INFO", "INFORMATION", "INFORMATIONAL":
		return "info"
	case "WARN", "WARNING":
		return "warning"
	case "ERROR", "ERR":
		return "error"
	case "FATAL", "CRITICAL", "CRIT":
		return "critical"
	default:
		return "unspecified"

	}

}

func attributesAsString(record interface {

	Attributes() pcommon.Map

}) map[string]string {
	return mergeAttributes(nil, record.Attributes())
}

func mergeAttributes(resource map[string]any, record pcommon.Map) map[string]string {

	result := make(map[string]string, len(resource)+record.Len())
	for key, value := range resource {

		encoded, err := json.Marshal(value)

		if err == nil {

			if text, ok := value.(string); ok {
				result[key] = text
			} else {
				result[key] = string(encoded)
			}
		}

	}
	for key, value := range record.All() {
		result[key] = value.AsString()
	}
	return result

}
