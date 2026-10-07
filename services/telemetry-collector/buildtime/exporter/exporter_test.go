package exporter

import (
	"context"
	"regexp"
	"testing"
	"time"

	collexporter "go.opentelemetry.io/collector/exporter"
)

func TestExporterSources(tester *testing.T) {

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

	tester.Cleanup(func() {

		if err := instance.Shutdown(context.Background()); err != nil {
			tester.Error(err)
		}

	})

	if instance.now == nil || instance.newNotificationID == nil {
		tester.Fatal("exporter sources missing")
	}

	before	:= time.Now()
	got		:= instance.now()
	after	:= time.Now()

	if got.Before(before) || got.After(after) {
		tester.Fatal("default clock did not return current time")
	}

	uuidPattern		:= regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	first, second	:= instance.newNotificationID(), instance.newNotificationID()

	if !uuidPattern.MatchString(first) || !uuidPattern.MatchString(second) {
		tester.Fatalf("expected UUID v4 values, got %q and %q", first, second)
	}

	if first == second {
		tester.Fatal("generated IDs must differ")
	}

	fixedTime := time.Date(2026, 10, 3, 12, 0, 0, 0, time.UTC)
	const fixedID = "00000000-0000-4000-8000-000000000001"
	instance.now = func() time.Time {

		return fixedTime

	}
	instance.newNotificationID = func() string {

		return fixedID

	}

	if got := instance.now(); got != fixedTime {
		tester.Fatalf("clock override: got %v", got)
	}

	fixedTime = fixedTime.Add(11 * time.Minute)

	if got := instance.now(); got != fixedTime {
		tester.Fatalf("advanced clock: got %v", got)
	}

	for range 2 {

		if got := instance.newNotificationID(); got != fixedID {
			tester.Fatalf("ID override: got %q", got)
		}

	}

}
