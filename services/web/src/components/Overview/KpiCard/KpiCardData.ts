export type KpiState = 'critical' | 'warning' | 'unack' | 'healthy';

interface KpiConfig {
  label: string;
  slogan: string;
}

export const KPI_CONFIG: Record<KpiState, KpiConfig> = {
  critical: {
    label: 'Critical',
    slogan: 'Needs action now',
  },

  warning: {
    label: 'Warning',
    slogan: 'Drifting from normal',
  },

  unack: {
    label: 'Unacknowledged',
    slogan: 'Waiting for an owner',
  },

  healthy: {
    label: 'Services',
    slogan: 'Online and responding',
  },
};
