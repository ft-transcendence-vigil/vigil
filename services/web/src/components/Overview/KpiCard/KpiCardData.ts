export type KpiState = 'critical' | 'warning' | 'unack' | 'healthy';

interface KpiConfig {
  label: string;
  slogan: string;
  caption: string;
}

export const KPI_CONFIG: Record<KpiState, KpiConfig> = {
  critical: {
    label: 'Critical',
    slogan: 'Needs action now',
    caption: 'last 24',
  },

  warning: {
    label: 'Warning',
    slogan: 'Drifting from normal',
    caption: 'last 24',
  },

  unack: {
    label: 'Unacknowledged',
    slogan: 'Waiting for an owner',
    caption: 'open right now',
  },

  healthy: {
    label: 'Services',
    slogan: 'Online and responding',
    caption: ' need attention',
  },
};
