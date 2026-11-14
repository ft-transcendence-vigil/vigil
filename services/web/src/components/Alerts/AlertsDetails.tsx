import type { AlertHistory } from '../../api/alertHistoryApi';
import { useAIDrawer } from '../../hooks/useAIDrawer';
import AskAIButton from '../shared/AskAIButton';

interface Props {
  alert: AlertHistory;
}

function formatWindow(seconds: number | null) {
  if (seconds === null) {
    return null;
  }

  if (seconds % 3600 === 0) {
    return `${seconds / 3600}h`;
  }

  if (seconds % 60 === 0) {
    return `${seconds / 60}m`;
  }
  return `${seconds}s`;
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleString();
}

function getRuleDescription(alert: AlertHistory) {
  if (alert.metric_name === 'service_silent') {
    return 'Silence watchdog alert. No alert rule produced it.';
  }

  if (alert.rule_id === null) {
    return 'The rule that produced this alert was deleted. The values shown above are the historical snapshot from when the alert fired.';
  }

  if (alert.rule === null) {
    return 'Current rule information is unavailable.';
  }

  const changedFields: string[] = [];

  if (alert.rule.metric_name !== alert.metric_name) {
    changedFields.push('metric');
  }

  if (alert.rule.threshold !== alert.threshold) {
    changedFields.push('threshold');
  }

  if (alert.rule.severity !== alert.severity) {
    changedFields.push('severity');
  }

  if (alert.rule.window_seconds !== alert.window_seconds) {
    changedFields.push('window');
  }

  if (alert.rule.aggregation !== alert.aggregation) {
    changedFields.push('aggregation');
  }

  const state = alert.rule.enabled ? 'enabled' : 'disabled';
  const defaultRule = alert.rule.is_default ? ' (default)' : '';

  if (changedFields.length === 0) {
    return `Current rule is ${state}${defaultRule}; unchanged since this alert fired.`;
  }
  return `Current rule is ${state}${defaultRule}; changed since this alert fired: ${changedFields.join(', ')}.`;
}

export default function AlertsDetails({ alert }: Props) {
  const isWatchdog = alert.metric_name === 'service_silent';
  const window = formatWindow(alert.window_seconds);
  const triggeredAt = formatDate(alert.triggered_at);
  const acknowledgedAt = formatDate(alert.acked_at);
  const resolvedAt = formatDate(alert.resolved_at);
  const ruleDescription = getRuleDescription(alert);
  const { openAI } = useAIDrawer();

  return (
    <div className="bg-vigil-bg px-3 py-4.5 space-y-4 mono">
      <div>
        <div className="flex justify-between items-center">
          <div className="uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
            Evaluation snapshot
          </div>
          <AskAIButton
            className="py-2.25! w-22! text-[11px]!"
            onClick={() => openAI(alert.id)}
          />
        </div>
        <div className="flex gap-x-25 gap-y-2 flex-wrap">
          {alert.signal_type && (
            <p className="lowercase text-vigil-muted text-[13px]">
              Signal:
              <span className="text-vigil-text ms-1 text-[14px]">
                {alert.signal_type}
              </span>
            </p>
          )}
          {!isWatchdog && alert.threshold !== null && (
            <p className="lowercase text-vigil-muted text-[13px]">
              Threshold:
              <span className="text-vigil-text ms-1 text-[14px]">
                {alert.threshold}
              </span>
            </p>
          )}
          {alert.aggregation && (
            <p className="lowercase text-vigil-muted text-[13px]">
              Aggregation:
              <span className="text-vigil-text ms-1 text-[14px]">
                {alert.aggregation}
              </span>
            </p>
          )}
          {window && (
            <p className="lowercase text-vigil-muted text-[13px]">
              Window:
              <span className="text-vigil-text ms-1 text-[14px]">{window}</span>
            </p>
          )}
        </div>
      </div>
      <div>
        <div className="uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
          Rule
        </div>
        <div className="text-[14px] text-vigil-muted">{ruleDescription}</div>
      </div>
      <div>
        <div className="uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
          Lifecycle
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
          <div>
            <span className="text-vigil-muted">Triggered</span> {triggeredAt}
          </div>
          {acknowledgedAt && (
            <div>
              <span className="text-vigil-muted">Acknowledged</span>{' '}
              {acknowledgedAt}
              {alert.acked_by && <> by {alert.acked_by}</>}
            </div>
          )}
          {resolvedAt && (
            <div>
              <span className="text-vigil-muted">Resolved</span> {resolvedAt}
              {alert.resolved_by && <> by {alert.resolved_by}</>}
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
          AI analysis
        </div>
        <div className="text-[14px] text-vigil-muted">
          {alert.llm_analysis ?? 'Analysis pending…'}
        </div>
      </div>
    </div>
  );
}
