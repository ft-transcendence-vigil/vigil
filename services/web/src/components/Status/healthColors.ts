import type { Health } from '../../hooks/useStatus';

export const healthColors: Record<
  Health,
  { label: string; dot: string; text: string; border: string }
> = {
  operational: {
    label: 'Operational',
    dot: 'bg-[#00d68f] shadow-[0_0_7px_#00d68f]',
    text: 'text-[#00d68f]',
    border: 'border-vigil-border',
  },
  degraded: {
    label: 'Degraded',
    dot: 'bg-[#f59e0b] shadow-[0_0_7px_#f59e0b]',
    text: 'text-[#f59e0b]',
    border: 'border-[#f59e0b59]',
  },
  down: {
    label: 'Down',
    dot: 'bg-[#ff4757] shadow-[0_0_7px_#ff4757]',
    text: 'text-[#ff4757]',
    border: 'border-[#ff475666]',
  },
};
