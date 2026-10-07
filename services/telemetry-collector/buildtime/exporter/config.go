package exporter

import (
	"fmt"
	"net/url"
	"time"
)

type Config struct {

	ClickHouseEndpoint		string			`mapstructure:"clickhouse_endpoint"`
	ClickHouseDatabase		string			`mapstructure:"clickhouse_database"`
	ClickHouseUsername		string			`mapstructure:"clickhouse_username"`
	ClickHousePassword		string			`mapstructure:"clickhouse_password"`

	BackendCallbackURL		string			`mapstructure:"backend_callback_url"`

	MaxSerializedBatchBytes	int				`mapstructure:"max_serialized_batch_bytes"`

	DedupWindow				time.Duration	`mapstructure:"dedup_window"`

}

func (config *Config) Validate() error {

	if config.ClickHouseDatabase == "" {
		return fmt.Errorf("clickhouse database is required")
	}

	if config.ClickHouseUsername == "" {
		return fmt.Errorf("clickhouse username is required")
	}

	if config.ClickHousePassword == "" {
		return fmt.Errorf("clickhouse password is required")
	}

	if config.MaxSerializedBatchBytes <= 0 {
		return fmt.Errorf("max serialized batch bytes must be greater than 0")
	}

	if config.DedupWindow <= 0 {
		return fmt.Errorf("dedup window must be greater than 0")
	}

	callbackURL, err := url.Parse(config.BackendCallbackURL)

	if err != nil {
		return fmt.Errorf("backend callback url must be a valid URL")
	}

	if callbackURL.Scheme != "http" && callbackURL.Scheme != "https" {
		return fmt.Errorf("backend callback url must use http or https")
	}

	if callbackURL.Hostname() == "" {
		return fmt.Errorf("backend callback url must include a hostname")
	}

	if callbackURL.RawQuery != "" || callbackURL.ForceQuery || callbackURL.Fragment != "" {
		return fmt.Errorf("backend callback url must not include a query or fragment")
	}

	ClickHouseURL, err := url.Parse(config.ClickHouseEndpoint)

	if err != nil {
		return fmt.Errorf("clickhouse endpoint must be a valid URL")
	}

	if ClickHouseURL.Scheme != "http" && ClickHouseURL.Scheme != "https" {
		return fmt.Errorf("clickhouse endpoint must use http or https")
	}

	if ClickHouseURL.Hostname() == "" {
		return fmt.Errorf("clickhouse endpoint must include a hostname")
	}

	if ClickHouseURL.User != nil {
		return fmt.Errorf("clickhouse endpoint must not include credentials")
	}

	return nil

}
