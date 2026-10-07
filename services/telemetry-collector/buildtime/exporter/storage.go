package exporter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Storage interface {
	InsertLogs(context.Context, []LogRow) error
	InsertMetrics(context.Context, []MetricRow) error
	InsertTraces(context.Context, []TraceRow) error
	ConfirmVisible(context.Context, string, string, int) error
	Close() error
}

type clickHouseStorage struct {

	client		*http.Client
	endpoint	string
	database	string
	username	string
	password	string

}

func newClickHouseStorage(config *Config) *clickHouseStorage {

	return &clickHouseStorage{client: &http.Client{Timeout: 10 * time.Second, Transport: http.DefaultTransport.(*http.Transport).Clone()}, endpoint: config.ClickHouseEndpoint, database: config.ClickHouseDatabase, username: config.ClickHouseUsername, password: config.ClickHousePassword}

}

func (storage *clickHouseStorage) InsertLogs(ctx context.Context, rows []LogRow) error {

	return insertRows(ctx, storage, "logs", rows)

}
func (storage *clickHouseStorage) InsertMetrics(ctx context.Context, rows []MetricRow) error {

	return insertRows(ctx, storage, "metrics", rows)

}
func (storage *clickHouseStorage) InsertTraces(ctx context.Context, rows []TraceRow) error {

	return insertRows(ctx, storage, "traces", rows)

}

func insertRows[T any](ctx context.Context, storage *clickHouseStorage, table string, rows []T) error {

	if len(rows) == 0 {
		return nil
	}

	var body bytes.Buffer
	encoder := json.NewEncoder(&body)
	for _, row := range rows {

		if err := encoder.Encode(row); err != nil {
			return fmt.Errorf("encode %s row: %w", table, err)
		}

	}
	_, err := storage.query(ctx, "INSERT INTO "+table+" FORMAT JSONEachRow", &body, "")
	return err

}

func (storage *clickHouseStorage) ConfirmVisible(ctx context.Context, signalType, notificationID string, expectedRows int) error {

	switch signalType {
	case "logs", "metrics", "traces":
	default:
		return fmt.Errorf("invalid storage signal type")
	}

	if notificationID == "" || expectedRows <= 0 {
		return fmt.Errorf("visibility confirmation requires notification ID and positive row count")
	}

	query		:= "SELECT count() FROM " + signalType + " WHERE attributes['vigil.notification_id'] = {notification_id:String} FORMAT TabSeparated"
	body, err	:= storage.query(ctx, query, nil, notificationID)

	if err != nil {
		return err
	}

	count, err := strconv.ParseUint(strings.TrimSpace(string(body)), 10, 64)

	if err != nil {
		return fmt.Errorf("invalid ClickHouse visibility count")
	}

	if count != uint64(expectedRows) {
		return fmt.Errorf("ClickHouse visibility count is %d, want %d", count, expectedRows)
	}

	return nil

}

func (storage *clickHouseStorage) query(ctx context.Context, query string, body io.Reader, notificationID string) ([]byte, error) {

	endpoint, err := url.Parse(storage.endpoint)

	if err != nil {
		return nil, fmt.Errorf("invalid ClickHouse endpoint")
	}

	parameters := endpoint.Query()
	parameters.Set("database", storage.database)
	parameters.Set("query", query)
	parameters.Set("async_insert", "0")
	parameters.Set("wait_end_of_query", "1")
	parameters.Set("date_time_input_format", "best_effort")

	if notificationID != "" {
		parameters.Set("param_notification_id", notificationID)
	}

	endpoint.RawQuery = parameters.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.String(), body)

	if err != nil {
		return nil, fmt.Errorf("create ClickHouse request: %w", err)
	}

	request.Header.Set("X-ClickHouse-User", storage.username)
	request.Header.Set("X-ClickHouse-Key", storage.password)
	request.Header.Set("Content-Type", "application/x-ndjson")
	response, err := storage.client.Do(request)

	if err != nil {
		return nil, fmt.Errorf("ClickHouse request: %w", err)
	}

	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ClickHouse returned HTTP %d", response.StatusCode)
	}

	result, err := io.ReadAll(io.LimitReader(response.Body, 1_048_577))

	if err != nil {
		return nil, fmt.Errorf("read ClickHouse response: %w", err)
	}

	if len(result) > 1_048_576 {
		return nil, fmt.Errorf("ClickHouse response exceeds size limit")
	}

	if notificationID == "" && len(bytes.TrimSpace(result)) != 0 {
		return nil, fmt.Errorf("unexpected ClickHouse insert response")
	}

	return result, nil

}

func (storage *clickHouseStorage) Close() error {

	storage.client.CloseIdleConnections()
	return nil

}
