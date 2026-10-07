package exporter

import (
	"fmt"
	"math"
	"reflect"
	"testing"
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	collplog "go.opentelemetry.io/collector/pdata/plog"
	collpmetric "go.opentelemetry.io/collector/pdata/pmetric"
	collptrace "go.opentelemetry.io/collector/pdata/ptrace"
)

func float64Pointer(value float64) *float64 {

	return &value

}
func boolPointer(value bool) *bool {

	return &value

}

func TestNormalizeSeverity(tester *testing.T) {

	labels := [...]string{"trace", "debug", "info", "warning", "error", "critical"}
	for index := range 24 {

		number := index + 1

		tester.Run(fmt.Sprintf("number_%d", number), func(tester *testing.T) {

			record := collplog.NewLogRecord()

			record.SetSeverityNumber(collplog.SeverityNumber(number))
			record.SetSeverityText("conflicting text")

			want := labels[(number-1)/4]

			if got := normalizeSeverity(record); got != want {
				tester.Fatalf("got %q, want %q", got, want)
			}

			if record.SeverityNumber() != collplog.SeverityNumber(number) || record.SeverityText() != "conflicting text" {
				tester.Fatal("normalization mutated the record")
			}

		})

	}

	tests := []struct {

		text	string
		want	string

	}{

		{"trace", "trace"},
		{"DEBUG", "debug"},
		{"info", "info"},
		{"Information", "info"},
		{"informational", "info"},
		{"warn", "warning"},
		{" WARNING ", "warning"},
		{"error", "error"},
		{"err", "error"},
		{"fatal", "critical"},
		{"Critical", "critical"},
		{"crit", "critical"},
		{"", "unspecified"},
		{"   ", "unspecified"},
		{"CUSTOM", "unspecified"},
		{"UNSPECIFIED", "unspecified"},

	}

	for _, number := range []collplog.SeverityNumber{0, -1, 25} {

		for _, test := range tests {

			tester.Run(fmt.Sprintf("number_%d_text_%q", number, test.text), func(tester *testing.T) {

				record := collplog.NewLogRecord()

				record.SetSeverityNumber(number)
				record.SetSeverityText(test.text)

				if got := normalizeSeverity(record); got != test.want {
					tester.Fatalf("got %q, want %q", got, test.want)
				}

				if record.SeverityNumber() != number || record.SeverityText() != test.text {
					tester.Fatal("normalization mutated the record")
				}

			})

		}

	}

}

func TestAttributesAsString(tester *testing.T) {

	record		:= collplog.NewLogRecord()
	attributes	:= record.Attributes()

	attributes.PutStr("string", "hello")
	attributes.PutInt("integer", 42)
	attributes.PutDouble("double", 1.25)
	attributes.PutBool("boolean", true)
	attributes.PutEmpty("empty")
	attributes.PutEmptyBytes("bytes").FromRaw([]byte{1, 2})
	attributes.PutEmptyMap("map").PutStr("nested", "value")

	slice := attributes.PutEmptySlice("slice")

	slice.AppendEmpty().SetStr("item")
	slice.AppendEmpty().SetInt(2)

	want := map[string]string{

		"string":  "hello",
		"integer": "42",
		"double":  "1.25",
		"boolean": "true",
		"empty":   "",
		"bytes":   "AQI=",
		"map":     `{"nested":"value"}`,
		"slice":   `["item",2]`,
	}

	before	:= attributes.AsRaw()
	got		:= attributesAsString(record)

	if !reflect.DeepEqual(got, want) {
		tester.Fatalf("got %#v, want %#v", got, want)
	}

	got["string"] = "changed"
	got["new"] = "value"

	if !reflect.DeepEqual(attributes.AsRaw(), before) {
		tester.Fatal("conversion mutated the input attributes")
	}

	empty := attributesAsString(collplog.NewLogRecord())

	if empty == nil || len(empty) != 0 {
		tester.Fatalf("expected a non-nil empty map, got %#v", empty)
	}

}

func TestLogsToRowsAttributes(tester *testing.T) {

	logs		:= collplog.NewLogs()
	resource	:= logs.ResourceLogs().AppendEmpty()

	resource.Resource().Attributes().PutStr("service.name", "api")

	record := resource.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()

	record.SetTimestamp(pcommon.Timestamp(1_000_000))
	record.Attributes().PutInt("attempt", 2)

	rows, err := logsToRows(logs)

	if err != nil {
		tester.Fatal(err)
	}

	if len(rows) != 1 {
		tester.Fatalf("got %d rows, want 1", len(rows))
	}

	if want := map[string]string{"service.name": "api", "attempt": "2"}; !reflect.DeepEqual(rows[0].Attributes, want) {

		tester.Fatalf("got attributes %#v, want %#v", rows[0].Attributes, want)
	}

}

func TestMetricsToRows(tester *testing.T) {

	for _, sum := range []bool{false, true} {
		tester.Run(fmt.Sprintf("sum_%t", sum), func(tester *testing.T) {

			metrics		:= collpmetric.NewMetrics()
			resource	:= metrics.ResourceMetrics().AppendEmpty()
			resource.Resource().Attributes().PutStr("service.name", "api")
			resource.Resource().Attributes().PutStr("host.id", "host-a")
			scope := resource.ScopeMetrics().AppendEmpty()
			scope.Scope().SetName("http-instrumentation")
			metric := scope.Metrics().AppendEmpty()
			metric.SetName("requests")
			metric.SetUnit("1")
			var points collpmetric.NumberDataPointSlice
			if sum {
				sumMetric := metric.SetEmptySum()
				sumMetric.SetAggregationTemporality(collpmetric.AggregationTemporalityCumulative)
				sumMetric.SetIsMonotonic(true)
				points = sumMetric.DataPoints()
			} else {
				points = metric.SetEmptyGauge().DataPoints()
			}
			for i := range 2 {

				point := points.AppendEmpty()
				point.SetStartTimestamp(pcommon.Timestamp(1_000_000_000))
				point.SetTimestamp(pcommon.Timestamp(1_234_567_890))

				if i == 0 {
					point.SetIntValue(42)
				} else {
					point.SetDoubleValue(1.25)
				}
				point.Attributes().PutBool("internal", true)

			}
			rows, err := metricsToRows(metrics)

			if err != nil {
				tester.Fatal(err)
			}

			if len(rows) != 2 {
				tester.Fatalf("got %d rows", len(rows))
			}

			for i, row := range rows {

				if row.ServiceName != "api" || row.Name != "requests" || row.Unit != "1" || row.Attributes["internal"] != "true" || row.Attributes["host.id"] != "host-a" || !row.Timestamp.Equal(time.Unix(0, 1_234_000_000).UTC()) {
					tester.Fatalf("unexpected row: %#v", row)
				}

				if row.Value == nil || *row.Value != []float64{42, 1.25}[i] {

					tester.Fatalf("unexpected value: %v", row.Value)
				}

				if row.SeriesID == "" || row.DedupPayload == "" || row.StartTimestamp == nil {
					tester.Fatalf("missing identity metadata: %#v", row)
				}

				if sum && (row.MetricType != "sum" || row.AggregationTemporality != "cumulative" || row.IsMonotonic == nil || !*row.IsMonotonic) {
					tester.Fatalf("unexpected sum metadata: %#v", row)
				}

				if !sum && (row.MetricType != "gauge" || row.AggregationTemporality != "unspecified" || row.IsMonotonic != nil) {
					tester.Fatalf("unexpected gauge metadata: %#v", row)
				}

			}
			rows[0].Attributes["internal"] = "changed"

			if v, _ := points.At(0).Attributes().Get("internal"); !v.Bool() {
				tester.Fatal("mutated input")
			}

		})
	}

}

func TestHistogramMetricsToRows(tester *testing.T) {

	metrics		:= collpmetric.NewMetrics()
	resource	:= metrics.ResourceMetrics().AppendEmpty()
	resource.Resource().Attributes().PutStr("service.name", "api")
	scope			:= resource.ScopeMetrics().AppendEmpty()

	histogramMetric	:= scope.Metrics().AppendEmpty()
	histogramMetric.SetName("latency")
	histogramMetric.SetUnit("ms")
	histogram := histogramMetric.SetEmptyHistogram()
	histogram.SetAggregationTemporality(collpmetric.AggregationTemporalityDelta)
	histogramPoint := histogram.DataPoints().AppendEmpty()
	histogramPoint.SetStartTimestamp(1)
	histogramPoint.SetTimestamp(2)
	histogramPoint.SetCount(3)
	histogramPoint.SetSum(12.5)
	histogramPoint.BucketCounts().FromRaw([]uint64{1, 2})
	histogramPoint.ExplicitBounds().FromRaw([]float64{10})

	exponentialMetric := scope.Metrics().AppendEmpty()
	exponentialMetric.SetName("payload_size")
	exponential := exponentialMetric.SetEmptyExponentialHistogram()
	exponential.SetAggregationTemporality(collpmetric.AggregationTemporalityCumulative)
	exponentialPoint := exponential.DataPoints().AppendEmpty()
	exponentialPoint.SetStartTimestamp(1)
	exponentialPoint.SetTimestamp(2)
	exponentialPoint.SetCount(2)
	exponentialPoint.SetSum(7)
	exponentialPoint.SetScale(2)
	exponentialPoint.Positive().SetOffset(1)
	exponentialPoint.Positive().BucketCounts().FromRaw([]uint64{2})

	rows, err := metricsToRows(metrics)

	if err != nil {
		tester.Fatal(err)
	}

	if len(rows) != 2 {
		tester.Fatalf("got %d rows", len(rows))
	}

	if rows[0].MetricType != "histogram" || rows[0].Value != nil || rows[0].HistogramSum == nil || *rows[0].HistogramSum != 12.5 || rows[0].HistogramCount == nil || *rows[0].HistogramCount != 3 || rows[0].AggregationTemporality != "delta" {
		tester.Fatalf("unexpected histogram row: %#v", rows[0])
	}

	if rows[1].MetricType != "exponential_histogram" || rows[1].Value != nil || rows[1].HistogramSum == nil || *rows[1].HistogramSum != 7 || rows[1].HistogramCount == nil || *rows[1].HistogramCount != 2 || rows[1].AggregationTemporality != "cumulative" {
		tester.Fatalf("unexpected exponential histogram row: %#v", rows[1])
	}

}

func TestMetricsToRowsInvalid(tester *testing.T) {

	tests := []struct {

		name	string
		change	func(collpmetric.Metric, collpmetric.NumberDataPoint)

	}{

		{"timestamp", func(metric collpmetric.Metric, point collpmetric.NumberDataPoint) {

			point.SetTimestamp(0)

		}},
		{"name", func(metric collpmetric.Metric, point collpmetric.NumberDataPoint) {

			metric.SetName("")

		}},
		{"nan", func(metric collpmetric.Metric, point collpmetric.NumberDataPoint) {

			point.SetDoubleValue(math.NaN())

		}},
		{"infinity", func(metric collpmetric.Metric, point collpmetric.NumberDataPoint) {

			point.SetDoubleValue(math.Inf(1))

		}},
		{"large_integer", func(metric collpmetric.Metric, point collpmetric.NumberDataPoint) {

			point.SetIntValue(1<<53 + 1)

		}},
		{"no_value", func(metric collpmetric.Metric, point collpmetric.NumberDataPoint) {

			point.CopyTo(metric.Gauge().DataPoints().AppendEmpty())
			metric.Gauge().DataPoints().At(1).SetTimestamp(1)

		}},
		{"summary", func(metric collpmetric.Metric, point collpmetric.NumberDataPoint) {

			metric.SetEmptySummary()

		}},

	}
	for _, test := range tests {

		tester.Run(test.name, func(tester *testing.T) {

			metrics		:= collpmetric.NewMetrics()
			resource	:= metrics.ResourceMetrics().AppendEmpty()

			resource.Resource().Attributes().PutStr("service.name", "api")

			metric := resource.ScopeMetrics().AppendEmpty().Metrics().AppendEmpty()

			metric.SetName("requests")

			point := metric.SetEmptyGauge().DataPoints().AppendEmpty()

			point.SetTimestamp(1)

			if test.name != "no_value" {
				point.SetIntValue(1)
			}

			test.change(metric, point)

			if rows, err := metricsToRows(metrics); err == nil || rows != nil {
				tester.Fatalf("expected rejection, got %#v, %v", rows, err)
			}

		})

	}

}

func TestTracesToRows(tester *testing.T) {

	for _, status := range []collptrace.StatusCode{collptrace.StatusCodeUnset, collptrace.StatusCodeOk, collptrace.StatusCodeError} {

		traces		:= collptrace.NewTraces()
		resource	:= traces.ResourceSpans().AppendEmpty()

		resource.Resource().Attributes().PutStr("service.name", "api")

		spans := resource.ScopeSpans().AppendEmpty().Spans()

		for i := range 2 {

			span := spans.AppendEmpty()

			span.SetTraceID(pcommon.TraceID{1})
			span.SetSpanID(pcommon.SpanID{2})

			if i == 1 {
				span.SetParentSpanID(pcommon.SpanID{3})
			}

			span.SetName("request")
			span.SetStartTimestamp(1_234_567_890)
			span.SetEndTimestamp(1_237_999_999)
			span.Status().SetCode(status)
			span.Attributes().PutInt("attempt", 2)

		}

		rows, err := tracesToRows(traces)

		if err != nil {
			tester.Fatal(err)
		}

		if len(rows) != 2 {
			tester.Fatalf("got %d rows", len(rows))
		}

		for _, row := range rows {

			if row.TraceID != (pcommon.TraceID{1}).String() || row.SpanID != (pcommon.SpanID{2}).String() || row.ServiceName != "api" || row.Name != "request" || row.DurationMS != 3 || row.Attributes["attempt"] != "2" || row.Status != []string{"unset", "ok", "error"}[int(status)] || !row.Timestamp.Equal(time.Unix(0, 1_234_000_000).UTC()) {

				tester.Fatalf("unexpected row: %#v", row)

			}

		}

		if rows[0].ParentSpanID != nil || rows[1].ParentSpanID == nil || *rows[1].ParentSpanID != (pcommon.SpanID{3}).String() {

			tester.Fatal("incorrect parent IDs")
		}

		rows[0].Attributes["attempt"] = "changed"

		if v, _ := spans.At(0).Attributes().Get("attempt"); v.Int() != 2 {
			tester.Fatal("mutated input")
		}

	}

}

func TestTracesToRowsInvalid(tester *testing.T) {

	tests := []struct {

		name	string
		change	func(collptrace.Span)

	}{

		{"trace_id", func(span collptrace.Span) {

			span.SetTraceID(pcommon.TraceID{})

		}},
		{"span_id", func(span collptrace.Span) {

			span.SetSpanID(pcommon.SpanID{})

		}},
		{"name", func(span collptrace.Span) {

			span.SetName("")

		}},
		{"start", func(span collptrace.Span) {

			span.SetStartTimestamp(0)

		}},
		{"end", func(span collptrace.Span) {

			span.SetEndTimestamp(0)

		}},
		{"reversed", func(span collptrace.Span) {

			span.SetEndTimestamp(1)

		}},
		{"overflow", func(span collptrace.Span) {

			span.SetEndTimestamp(pcommon.Timestamp(2 + (uint64(math.MaxUint32)+1)*uint64(time.Millisecond)))

		}},
		{"status", func(span collptrace.Span) {

			span.Status().SetCode(collptrace.StatusCode(99))

		}},

	}

	for _, test := range tests {

		tester.Run(test.name, func(tester *testing.T) {

			traces		:= collptrace.NewTraces()
			resource	:= traces.ResourceSpans().AppendEmpty()

			resource.Resource().Attributes().PutStr("service.name", "api")

			span := resource.ScopeSpans().AppendEmpty().Spans().AppendEmpty()

			span.SetTraceID(pcommon.TraceID{1})
			span.SetSpanID(pcommon.SpanID{2})
			span.SetName("request")
			span.SetStartTimestamp(2)
			span.SetEndTimestamp(3)
			test.change(span)

			if rows, err := tracesToRows(traces); err == nil || rows != nil {
				tester.Fatalf("expected rejection, got %#v, %v", rows, err)
			}

		})

	}

}

func TestLogsToRowsConversion(tester *testing.T) {

	tests := []struct {

		name	string
		body	func(pcommon.Value)
		want	string

	}{

		{"string", func(value pcommon.Value) {

			value.SetStr("hello")

		}, "hello"},
		{"empty", func(value pcommon.Value) {

		}, ""},
		{"integer", func(value pcommon.Value) {

			value.SetInt(42)

		}, "42"},
		{"boolean", func(value pcommon.Value) {

			value.SetBool(true)

		}, "true"},
		{"map", func(value pcommon.Value) {

			value.SetEmptyMap().PutStr("event", "request")

		}, `{"event":"request"}`},
		{"slice", func(value pcommon.Value) {

			value.SetEmptySlice().AppendEmpty().SetStr("item")

		}, `["item"]`},
		{"bytes", func(value pcommon.Value) {

			value.SetEmptyBytes().FromRaw([]byte{1, 2})

		}, "AQI="},

	}

	for _, test := range tests {

		tester.Run(test.name, func(tester *testing.T) {

			logs		:= collplog.NewLogs()
			resource	:= logs.ResourceLogs().AppendEmpty()

			resource.Resource().Attributes().PutStr("service.name", "api")

			record := resource.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()

			record.SetTimestamp(pcommon.NewTimestampFromTime(time.Date(2026, 10, 3, 12, 0, 0, 123_456_789, time.FixedZone("offset", 2*60*60))))
			test.body(record.Body())

			rows, err := logsToRows(logs)

			if err != nil {
				tester.Fatal(err)
			}

			if len(rows) != 1 {
				tester.Fatalf("got %d rows", len(rows))
			}

			if rows[0].Message != test.want || rows[0].Severity != "unspecified" || rows[0].ServiceName != "api" {
				tester.Fatalf("unexpected row: %#v", rows[0])
			}

			if want := time.Date(2026, 10, 3, 10, 0, 0, 123_000_000, time.UTC); !rows[0].Timestamp.Equal(want) || rows[0].Timestamp.Location() != time.UTC {
				tester.Fatalf("unexpected timestamp: %v", rows[0].Timestamp)
			}

			if record.Body().AsString() != test.want {
				tester.Fatal("conversion mutated body")
			}

		})

	}

	for _, test := range []struct {

		number	collplog.SeverityNumber
		text	string
		want	string

	}{

		{collplog.SeverityNumberError, "warning", "error"},
		{collplog.SeverityNumberUnspecified, "Warning", "warning"},
		{collplog.SeverityNumberUnspecified, "CUSTOM", "unspecified"},

	} {

		logs		:= collplog.NewLogs()
		resource	:= logs.ResourceLogs().AppendEmpty()

		resource.Resource().Attributes().PutStr("service.name", "api")

		record := resource.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()

		record.SetTimestamp(1)
		record.SetSeverityNumber(test.number)
		record.SetSeverityText(test.text)

		rows, err := logsToRows(logs)

		if err != nil {
			tester.Fatal(err)
		}

		if len(rows) != 1 || rows[0].Severity != test.want {
			tester.Fatalf("unexpected severity rows: %#v", rows)
		}

	}

}

func TestLogsToRowsMissingTimestamp(tester *testing.T) {

	logs		:= collplog.NewLogs()
	resource	:= logs.ResourceLogs().AppendEmpty()

	resource.Resource().Attributes().PutStr("service.name", "api")

	records := resource.ScopeLogs().AppendEmpty().LogRecords()

	records.AppendEmpty().SetTimestamp(1)
	records.AppendEmpty()

	if rows, err := logsToRows(logs); err == nil || rows != nil {
		tester.Fatalf("expected no partial rows, got %#v, %v", rows, err)
	}

}

func TestRowsServiceNameValidation(tester *testing.T) {

	tests := []struct {

		name	string
		set		func(pcommon.Map)

	}{

		{"missing", func(attributes pcommon.Map) {

		}},
		{"empty", func(attributes pcommon.Map) {

			attributes.PutStr("service.name", "")

		}},
		{"whitespace", func(attributes pcommon.Map) {

			attributes.PutStr("service.name", "  ")

		}},
		{"integer", func(attributes pcommon.Map) {

			attributes.PutInt("service.name", 42)

		}},

	}

	for _, test := range tests {

		tester.Run(test.name, func(tester *testing.T) {

			logs		:= collplog.NewLogs()
			logResource	:= logs.ResourceLogs().AppendEmpty()

			test.set(logResource.Resource().Attributes())
			logResource.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty().SetTimestamp(1)

			if rows, err := logsToRows(logs); err == nil || rows != nil {
				tester.Fatalf("expected log rejection, got %#v, %v", rows, err)
			}

			metrics			:= collpmetric.NewMetrics()
			metricResource	:= metrics.ResourceMetrics().AppendEmpty()

			test.set(metricResource.Resource().Attributes())

			metric := metricResource.ScopeMetrics().AppendEmpty().Metrics().AppendEmpty()

			metric.SetName("requests")

			point := metric.SetEmptyGauge().DataPoints().AppendEmpty()

			point.SetTimestamp(1)
			point.SetIntValue(1)

			if rows, err := metricsToRows(metrics); err == nil || rows != nil {
				tester.Fatalf("expected metric rejection, got %#v, %v", rows, err)
			}

			traces			:= collptrace.NewTraces()

			traceResource	:= traces.ResourceSpans().AppendEmpty()
			test.set(traceResource.Resource().Attributes())

			span := traceResource.ScopeSpans().AppendEmpty().Spans().AppendEmpty()

			span.SetTraceID(pcommon.TraceID{1})
			span.SetSpanID(pcommon.SpanID{2})
			span.SetName("request")
			span.SetStartTimestamp(1)
			span.SetEndTimestamp(2)

			if rows, err := tracesToRows(traces); err == nil || rows != nil {
				tester.Fatalf("expected trace rejection, got %#v, %v", rows, err)
			}

		})

	}

}

func TestRowsEmptyBatches(tester *testing.T) {

	if rows, err := logsToRows(collplog.NewLogs()); err != nil || rows == nil || len(rows) != 0 {
		tester.Fatalf("unexpected logs: %#v, %v", rows, err)
	}

	if rows, err := metricsToRows(collpmetric.NewMetrics()); err != nil || rows == nil || len(rows) != 0 {
		tester.Fatalf("unexpected metrics: %#v, %v", rows, err)
	}

	if rows, err := tracesToRows(collptrace.NewTraces()); err != nil || rows == nil || len(rows) != 0 {
		tester.Fatalf("unexpected traces: %#v, %v", rows, err)
	}

}

func TestRowsResourceScopeGroups(tester *testing.T) {

	logs	:= collplog.NewLogs()
	metrics	:= collpmetric.NewMetrics()
	traces	:= collptrace.NewTraces()

	for resourceIndex := range 2 {

		service			:= fmt.Sprintf("service_%d", resourceIndex)
		logResource		:= logs.ResourceLogs().AppendEmpty()
		metricResource	:= metrics.ResourceMetrics().AppendEmpty()
		traceResource	:= traces.ResourceSpans().AppendEmpty()

		logResource.Resource().Attributes().PutStr("service.name", service)
		metricResource.Resource().Attributes().PutStr("service.name", service)
		traceResource.Resource().Attributes().PutStr("service.name", service)

		for scopeIndex := range 2 {

			record := logResource.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()

			record.SetTimestamp(1)
			record.Body().SetStr(fmt.Sprintf("scope_%d", scopeIndex))

			metric := metricResource.ScopeMetrics().AppendEmpty().Metrics().AppendEmpty()

			metric.SetName(fmt.Sprintf("scope_%d", scopeIndex))

			point := metric.SetEmptyGauge().DataPoints().AppendEmpty()

			point.SetTimestamp(1)
			point.SetIntValue(int64(scopeIndex))

			span := traceResource.ScopeSpans().AppendEmpty().Spans().AppendEmpty()

			span.SetTraceID(pcommon.TraceID{1})
			span.SetSpanID(pcommon.SpanID{byte(scopeIndex + 1)})
			span.SetName(fmt.Sprintf("scope_%d", scopeIndex))
			span.SetStartTimestamp(1)
			span.SetEndTimestamp(2)

		}

	}

	logRows, err := logsToRows(logs)

	if err != nil {
		tester.Fatal(err)
	}

	metricRows, err := metricsToRows(metrics)

	if err != nil {
		tester.Fatal(err)
	}

	traceRows, err := tracesToRows(traces)

	if err != nil {
		tester.Fatal(err)
	}

	if len(logRows) != 4 || len(metricRows) != 4 || len(traceRows) != 4 {
		tester.Fatal("missing resource/scope rows")
	}

	for index := range 4 {

		service	:= fmt.Sprintf("service_%d", index/2)
		scope	:= fmt.Sprintf("scope_%d", index%2)

		if logRows[index].ServiceName != service || logRows[index].Message != scope {
			tester.Fatalf("unexpected log: %#v", logRows[index])
		}

		if metricRows[index].ServiceName != service || metricRows[index].Name != scope {
			tester.Fatalf("unexpected metric: %#v", metricRows[index])
		}

		if traceRows[index].ServiceName != service || traceRows[index].Name != scope {
			tester.Fatalf("unexpected trace: %#v", traceRows[index])
		}

	}

}

func TestMetricsToRowsNoRecordedValue(tester *testing.T) {

	metrics		:= collpmetric.NewMetrics()
	resource	:= metrics.ResourceMetrics().AppendEmpty()

	resource.Resource().Attributes().PutStr("service.name", "api")

	metric := resource.ScopeMetrics().AppendEmpty().Metrics().AppendEmpty()

	metric.SetName("requests")

	point := metric.SetEmptyGauge().DataPoints().AppendEmpty()

	point.SetTimestamp(1)
	point.SetIntValue(42)
	point.SetFlags(collpmetric.DefaultDataPointFlags.WithNoRecordedValue(true))

	if rows, err := metricsToRows(metrics); err == nil || rows != nil {
		tester.Fatalf("expected rejection, got %#v, %v", rows, err)
	}

}

func TestTracesToRowsDurationBoundaries(tester *testing.T) {

	tests := []struct {

		name	string
		nanos	uint64
		want	uint32
		invalid	bool

	}{

		{"zero", 0, 0, false},
		{"sub_millisecond", 999_999, 0, false},
		{"one_millisecond", 1_000_000, 1, false},
		{"maximum", uint64(math.MaxUint32) * 1_000_000, math.MaxUint32, false},
		{"maximum_fraction", (uint64(math.MaxUint32)+1)*1_000_000 - 1, math.MaxUint32, false},
		{"overflow", (uint64(math.MaxUint32) + 1) * 1_000_000, 0, true},
		{"duration_overflow", 1 << 63, 0, true},

	}

	for _, test := range tests {

		tester.Run(test.name, func(tester *testing.T) {

			traces		:= collptrace.NewTraces()
			resource	:= traces.ResourceSpans().AppendEmpty()

			resource.Resource().Attributes().PutStr("service.name", "api")

			span := resource.ScopeSpans().AppendEmpty().Spans().AppendEmpty()

			span.SetTraceID(pcommon.TraceID{1})
			span.SetSpanID(pcommon.SpanID{2})
			span.SetName("request")
			span.SetStartTimestamp(1)
			span.SetEndTimestamp(pcommon.Timestamp(1 + test.nanos))

			rows, err := tracesToRows(traces)
			if test.invalid {

				if err == nil || rows != nil {
					tester.Fatalf("expected rejection, got %#v, %v", rows, err)
				}

				return

			}

			if err != nil {
				tester.Fatal(err)
			}

			if len(rows) != 1 || rows[0].DurationMS != test.want {
				tester.Fatalf("unexpected duration rows: %#v", rows)
			}

		})

	}

}

func TestAttributesAsStringSignalTypes(tester *testing.T) {

	tests := []struct {

		name	string
		record interface{ Attributes() pcommon.Map }

	}{

		{"log", collplog.NewLogRecord()},
		{"metric", collpmetric.NewNumberDataPoint()},
		{"trace", collptrace.NewSpan()},

	}

	for _, test := range tests {

		tester.Run(test.name, func(tester *testing.T) {

			attributes := test.record.Attributes()

			attributes.PutInt("attempt", 2)
			attributes.PutEmptyMap("nested").PutBool("enabled", true)

			got		:= attributesAsString(test.record)
			want	:= map[string]string{

				"attempt": "2",
				"nested":  `{"enabled":true}`,
			}

			if !reflect.DeepEqual(got, want) {
				tester.Fatalf("got %#v, want %#v", got, want)
			}

			got["attempt"] = "changed"

			if value, _ := attributes.Get("attempt"); value.Int() != 2 {
				tester.Fatal("conversion mutated input")
			}

		})

	}

}
