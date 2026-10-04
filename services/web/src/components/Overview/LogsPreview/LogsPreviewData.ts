import type { Data } from './LogsPreviewRow';

const MOCK_DATA: Data[] = [
  {
    date: '15:44:06',
    severity: 'info',
    title: 'email-worker',
    threshold: 'Cache refreshed',
    className: 'border border-blue-500/30 bg-blue-400/10 text-blue-500/80',
  },
  {
    date: '15:41:25',
    severity: 'error',
    title: 'checkout-service',
    threshold: 'Upstream timeout after 3000ms',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    date: '15:43:30',
    severity: 'warn',
    title: 'redis-cache',
    threshold: 'Slow query detected (412ms)',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    date: '15:45:12',
    severity: 'error',
    title: 'payment-service',
    threshold: 'Connection refused by upstream',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    date: '15:46:08',
    severity: 'warn',
    title: 'api-gateway',
    threshold: 'High latency detected (820ms)',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    date: '15:47:19',
    severity: 'info',
    title: 'auth-service',
    threshold: 'Token cache synchronized',
    className: 'border border-blue-500/30 bg-blue-400/10 text-blue-500/80',
  },
  {
    date: '15:48:33',
    severity: 'error',
    title: 'orders-service',
    threshold: 'Database connection timeout',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    date: '15:49:41',
    severity: 'warn',
    title: 'postgres-db',
    threshold: 'Connection pool nearing capacity',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    date: '15:50:05',
    severity: 'info',
    title: 'notification-worker',
    threshold: 'Queue processing resumed',
    className: 'border border-blue-500/30 bg-blue-400/10 text-blue-500/80',
  },
  {
    date: '15:51:27',
    severity: 'error',
    title: 'inventory-service',
    threshold: 'Failed to update stock record',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    date: '15:52:14',
    severity: 'warn',
    title: 'search-service',
    threshold: 'Elasticsearch response slow (675ms)',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    date: '15:53:46',
    severity: 'info',
    title: 'file-worker',
    threshold: 'Temporary files cleaned',
    className: 'border border-blue-500/30 bg-blue-400/10 text-blue-500/80',
  },
  {
    date: '15:54:31',
    severity: 'error',
    title: 'user-service',
    threshold: 'Unexpected 500 response',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    date: '15:55:09',
    severity: 'warn',
    title: 'metrics-service',
    threshold: 'Memory usage above 80%',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    date: '15:56:22',
    severity: 'info',
    title: 'billing-worker',
    threshold: 'Invoice batch completed',
    className: 'border border-blue-500/30 bg-blue-400/10 text-blue-500/80',
  },
  {
    date: '15:57:38',
    severity: 'error',
    title: 'checkout-service',
    threshold: 'Payment provider request failed',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    date: '15:58:17',
    severity: 'warn',
    title: 'redis-cache',
    threshold: 'Cache hit rate dropped to 72%',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
  {
    date: '15:59:44',
    severity: 'info',
    title: 'email-worker',
    threshold: '12 queued emails processed',
    className: 'border border-blue-500/30 bg-blue-400/10 text-blue-500/80',
  },
  {
    date: '16:00:26',
    severity: 'error',
    title: 'api-gateway',
    threshold: 'Rate limit exceeded',
    className: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  },
  {
    date: '16:01:53',
    severity: 'warn',
    title: 'cdn-service',
    threshold: 'Origin response time increased',
    className:
      'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  },
];

export default MOCK_DATA;
