import type { Data } from './AlertsPreviewRow';

const MOCK_DATA: Data[] = [
  {
    severity: 'critical',
    title: 'notification-service',
    threshold: 'service_silent · no data received',
    date: '39m ago',
    action: 'resolve',
    llmAnalysis:
      'No batches received. The worker likely stopped or lost its ingest route.',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    severity: 'warning',
    title: 'payment-gateway',
    threshold: 'stripe_webhook_latency ≥ 2000 · 60s',
    date: '51m ago',
    action: 'ack',
    llmAnalysis:
      'Webhook round trips are slow; the provider status page may show an incident.',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    severity: 'critical',
    title: 'checkout-service',
    threshold: 'request_latency_ms ≥ 400 · 60s',
    date: '1h ago',
    action: 'ack',
    llmAnalysis:
      'Checkout latency doubled while payment-gateway calls are slow. Check the gateway first.',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    severity: 'warning',
    title: 'auth-service',
    threshold: 'failed_login_rate ≥ 15% · 5m',
    date: '1h 12m ago',
    action: 'ack',
    llmAnalysis:
      'Failed authentication attempts increased significantly. Check recent deployments and suspicious traffic.',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    severity: 'critical',
    title: 'orders-service',
    threshold: 'error_rate ≥ 8% · 5m',
    date: '1h 34m ago',
    action: 'resolve',
    llmAnalysis:
      'Order requests are failing above the normal baseline. Database or payment dependencies may be degraded.',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    severity: 'warning',
    title: 'api-gateway',
    threshold: 'p95_latency_ms ≥ 750 · 10m',
    date: '2h ago',
    action: 'ack',
    llmAnalysis:
      'Gateway latency is elevated across multiple routes. Check upstream service response times.',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    severity: 'critical',
    title: 'database-primary',
    threshold: 'connection_pool_usage ≥ 95% · 3m',
    date: '2h 21m ago',
    action: 'resolve',
    llmAnalysis:
      'The database connection pool is nearly exhausted. Look for leaked or unusually long-running connections.',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    severity: 'warning',
    title: 'email-worker',
    threshold: 'queue_depth ≥ 500 · 10m',
    date: '3h ago',
    action: 'ack',
    llmAnalysis:
      'Email jobs are accumulating faster than workers can process them. Worker capacity may be insufficient.',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    severity: 'critical',
    title: 'inventory-service',
    threshold: 'http_5xx_rate ≥ 10% · 5m',
    date: '3h 18m ago',
    action: 'ack',
    llmAnalysis:
      'Inventory requests are returning frequent server errors. Check database connectivity and recent changes.',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    severity: 'warning',
    title: 'search-service',
    threshold: 'search_latency_ms ≥ 1200 · 5m',
    date: '4h ago',
    action: 'resolve',
    llmAnalysis:
      'Search queries are taking longer than expected. Index load or backend query pressure may be responsible.',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
];

export default MOCK_DATA;
