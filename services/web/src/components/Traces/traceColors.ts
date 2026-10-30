import type { TraceStatus } from '../../api/tracesApi';

export const statusColors: Record<TraceStatus, string> = {
  ok: 'bg-[#00d68f1a] text-[#00d68f] border border-[#00d68f33]',
  error: 'bg-[#ff47571a] text-[#ff4757] border border-[#ff475632]',
  unset: 'bg-[#6b7da81a] text-vigil-muted-extra border border-[#323b4b8a]',
};

export function durationColor(ms: number): string {
  if (ms > 800) return 'bg-[#ff4757]';
  if (ms < 60) return 'bg-[#00d68f]';
  return 'bg-[#f59e0b]';
}
