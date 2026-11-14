import type { TraceStatus } from '../../api/tracesApi';

export const statusColors: Record<TraceStatus, string> = {
  ok: 'bg-vigil-success-bg text-vigil-success border border-vigil-success-border',
  error: 'bg-vigil-critical-bg text-vigil-critical border border-vigil-critical-border',
  unset: 'bg-vigil-status-muted-bg text-vigil-muted-extra border border-vigil-status-muted-border',
};

export function durationColor(ms: number): string {
  if (ms > 800) return 'bg-vigil-critical';
  if (ms < 60) return 'bg-vigil-success';
  return 'bg-vigil-warning';
}
