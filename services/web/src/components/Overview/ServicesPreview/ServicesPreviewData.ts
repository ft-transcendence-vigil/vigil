import type { Data } from './ServicesPreviewCard';

const MOCK_DATA: Data[] = [
  {
    severity: 'silent',
    title: 'notification-service',
    latency: '78ms',
    throughput: '419 req/s',
    className: {
      bgColor: 'bg-blue-500/80',
      textColor: 'text-blue-500/80',
    },
  },
  {
    severity: 'alerting',
    title: 'checkout-service',
    latency: '137ms',
    throughput: '34 req/s',
    className: {
      bgColor: 'bg-red-500/80',
      textColor: 'text-red-500/80',
    },
  },
  {
    severity: 'degraded',
    title: 'data-pipeline',
    latency: '108ms',
    throughput: '114 req/s',
    className: {
      bgColor: 'bg-yellow-500/80',
      textColor: 'text-yellow-500/80',
    },
  },
  {
    severity: 'silent',
    title: 'auth-service',
    latency: '42ms',
    throughput: '287 req/s',
    className: {
      bgColor: 'bg-blue-500/80',
      textColor: 'text-blue-500/80',
    },
  },
  {
    severity: 'degraded',
    title: 'search-service',
    latency: '164ms',
    throughput: '86 req/s',
    className: {
      bgColor: 'bg-yellow-500/80',
      textColor: 'text-yellow-500/80',
    },
  },
  {
    severity: 'alerting',
    title: 'payment-service',
    latency: '219ms',
    throughput: '27 req/s',
    className: {
      bgColor: 'bg-red-500/80',
      textColor: 'text-red-500/80',
    },
  },
  {
    severity: 'silent',
    title: 'analytics-service',
    latency: '63ms',
    throughput: '356 req/s',
    className: {
      bgColor: 'bg-blue-500/80',
      textColor: 'text-blue-500/80',
    },
  },
];

export default MOCK_DATA;
