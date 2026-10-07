package exporter

import (
	"testing"
	"time"
)

func TestConfig_Validate(tester *testing.T) {

	baselineValidConfig := Config{

		ClickHouseEndpoint:			"http://clickhouse:8123",
		ClickHouseDatabase:			"vigil",
		ClickHouseUsername:			"writer",
		ClickHousePassword:			"test-password",
		BackendCallbackURL:			"http://backend:8081/internal/alerts/trigger-evaluation",
		MaxSerializedBatchBytes:	1024 * 1024,
		DedupWindow:				10 * time.Minute,

	}

	tests := []struct {

		name		string
		change		func(*Config)
		wantsErr	string

	}{

		{name: "valid config"},
		{
			name:		"zero dedup window",
			change:		func(config *Config) {

				config.DedupWindow = 0

			},
			wantsErr:	"dedup window must be greater than 0",
		},
		{
			name:		"negative dedup window",
			change:		func(config *Config) {

				config.DedupWindow = -time.Minute

			},
			wantsErr:	"dedup window must be greater than 0",
		},
		{
			name:		"custom dedup durations",
			change:		func(config *Config) {

				config.DedupWindow = 5 * time.Minute

			},
		},
		{
			name:		"minimum positive dedup durations",
			change:		func(config *Config) {

				config.DedupWindow = time.Nanosecond

			},
		},
		{
			name:		"empty config",
			change:		func(config *Config) {

				*config = Config{}

			},
			wantsErr:	"clickhouse database is required",
		},
		{
			name:		"missing database",
			change:		func(config *Config) {

				config.ClickHouseDatabase = ""

			},
			wantsErr:	"clickhouse database is required",
		},
		{
			name:		"missing username",
			change:		func(config *Config) {

				config.ClickHouseUsername = ""

			},
			wantsErr:	"clickhouse username is required",
		},
		{
			name:		"missing password",
			change:		func(config *Config) {

				config.ClickHousePassword = ""

			},
			wantsErr:	"clickhouse password is required",
		},
		{
			name:		"zero byte limit",
			change:		func(config *Config) {

				config.MaxSerializedBatchBytes = 0

			},
			wantsErr:	"max serialized batch bytes must be greater than 0",
		},
		{
			name:		"negative byte limit",
			change:		func(config *Config) {

				config.MaxSerializedBatchBytes = -1

			},
			wantsErr:	"max serialized batch bytes must be greater than 0",
		},
		{
			name:		"minimum positive byte limit",
			change:		func(config *Config) {

				config.MaxSerializedBatchBytes = 1

			},
		},

	}

	for _, endpoint := range []struct {

		name	string
		set		func(*Config, string)

	}{

		{"backend callback url", func(config *Config, value string) {

			config.BackendCallbackURL = value

		}},
		{"clickhouse endpoint", func(config *Config, value string) {

			config.ClickHouseEndpoint = value

		}},

	} {
		for _, urlCase := range []struct {

			name		string
			value		string
			errorSuffix	string

		}{

			{"empty", "", "must use http or https"},
			{"relative path", "/path", "must use http or https"},
			{"unsupported scheme", "ftp://server/path", "must use http or https"},
			{"missing hostname", "http:///path", "must include a hostname"},
			{"malformed escape", "http://server/%zz", "must be a valid URL"},
			{"malformed port", "http://server:abc/path", "must be a valid URL"},
			{"malformed credentials", "http://user:secret%zz@server", "must be a valid URL"},
			{"https", "https://server/path", ""},
			{"IPv4 address", "http://1.1.1.1/path", ""},
			{"IPv6 address", "http://[::1]:8080/path", ""},
			{"no explicit port", "http://server/path", ""},

		} {
			wantsErr := ""

			if urlCase.errorSuffix != "" {
				wantsErr = endpoint.name + " " + urlCase.errorSuffix
			}

			tests = append(tests, struct {

				name		string
				change		func(*Config)
				wantsErr	string

			}{

				name:		endpoint.name + "/" + urlCase.name,
				change:		func(config *Config) {

					endpoint.set(config, urlCase.value)

				},
				wantsErr:	wantsErr,

			})
		}
	}

	for _, value := range []string{

		"http://backend/path?mode=fast",
		"http://backend/path?",
		"http://backend/path#section",
		"http://backend/path?mode=fast#section",

	} {

		tests = append(tests, struct {

			name		string
			change		func(*Config)
			wantsErr	string

		}{

			name:		"callback query or fragment/" + value,
			change:		func(config *Config) {

				config.BackendCallbackURL = value

			},
			wantsErr:	"backend callback url must not include a query or fragment",

		})

	}

	for _, value := range []string{

		"http://writer:test-password@clickhouse:8123",
		"http://writer@clickhouse:8123",

	} {

		tests = append(tests, struct {

			name		string
			change		func(*Config)
			wantsErr	string

		}{

			name:		"clickhouse credentials/" + value,
			change:		func(config *Config) {

				config.ClickHouseEndpoint = value

			},
			wantsErr:	"clickhouse endpoint must not include credentials",

		})

	}

	for _, test := range tests {

		tester.Run(test.name, func(tester *testing.T) {

			config := baselineValidConfig

			if test.change != nil {
				test.change(&config)
			}

			err := config.Validate()

			if test.wantsErr == "" {

				if err != nil {
					tester.Fatalf("Config.Validate() unexpected error: %v", err)
				}

				return
			}

			if err == nil {
				tester.Fatalf("Config.Validate() returned nil, want %q", test.wantsErr)
			}

			if err.Error() != test.wantsErr {
				tester.Errorf("Config.Validate() error = %q, want %q", err.Error(), test.wantsErr)
			}

		})

	}

}

func TestCreateDefaultConfigDedup(tester *testing.T) {

	config := createDefaultConfig().(*Config)

	if config.DedupWindow != 10*time.Minute {
		tester.Fatalf("got dedup window %v, want 10m", config.DedupWindow)
	}

	config.ClickHouseEndpoint = "http://clickhouse:8123"
	config.ClickHouseDatabase = "vigil"
	config.ClickHouseUsername = "writer"
	config.ClickHousePassword = "test-password"
	config.BackendCallbackURL = "http://backend:8081/internal/alerts/trigger-evaluation"

	if err := config.Validate(); err != nil {
		tester.Fatal(err)
	}

	config.DedupWindow = 3 * time.Minute

	if err := config.Validate(); err != nil {
		tester.Fatal(err)
	}

	if fresh := createDefaultConfig().(*Config); fresh.DedupWindow != 10*time.Minute {
		tester.Fatal("default config was not fresh")
	}

}
