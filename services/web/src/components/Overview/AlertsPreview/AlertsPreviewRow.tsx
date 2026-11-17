import { useState } from 'react';
import AskAIButton from '../../shared/AskAIButton';
import { useAIDrawer } from '../../../hooks/useAIDrawer';
import type { AlertHistory, AlertStatus } from '../../../api/alertHistoryApi';
import { timeAgo } from '../../shared/utils/format';
import { OTHER_CLASS, SEVERITY_CLASS, describeAlert } from '../overviewData';

const actionBtn =
  'border border-vigil-border uppercase text-[9px] sm:text-[10px] tracking-wider h-7 sm:h-8 w-14 sm:w-16 cursor-pointer text-vigil-muted hover:text-vigil-text-hover hover:border-vigil-border-hover transition-[color, border-color] duration-300';

interface Data {
  alert: AlertHistory;
  canAct: boolean;
  isUpdating: boolean;
  onStatusChange: (status: AlertStatus) => void;
}

export default function AlertsPreviewRow({
  alert,
  canAct,
  isUpdating,
  onStatusChange,
}: Data) {
  const [isOpen, setIsOpen] = useState(false);
  const { openAI } = useAIDrawer();
  // sent -> ack, acknowledged -> resolve, resolved -> done
  const next: AlertStatus | null =
    alert.status === 'sent'
      ? 'acknowledged'
      : alert.status === 'acknowledged'
        ? 'resolved'
        : null;

  return (
    <div className="alert-preview-row">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex justify-between items-center gap-2 border-b border-b-vigil-border px-3 sm:px-5 py-3 mono hover:bg-vigil-preview-hover transition-[background-color] duration-300 cursor-pointer"
      >
        <div className="flex items-center min-w-0">
          <div
            className={`shrink-0 text-[8px] sm:text-[10px] tracking-widest uppercase py-0.5 w-15 sm:w-16.5 text-center me-3 ${SEVERITY_CLASS[alert.severity] ?? OTHER_CLASS}`}
          >
            {alert.severity}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] mb-0.5 truncate">{alert.service}</div>
            <div className="xs:text-[9px] text-[11px] text-vigil-muted-extra truncate">
              {describeAlert(alert)}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end shrink-0">
          <span
            className="text-[8.5px] sm:text-[10px] me-2 sm:me-3 text-vigil-muted-extra"
            title={new Date(alert.triggered_at).toLocaleString()}
          >
            {timeAgo(alert.triggered_at)}
          </span>
          {next === null ? (
            <span className="text-[10px] text-vigil-muted-extra w-14 sm:w-16 text-center">
              ✓ done
            </span>
          ) : (
            canAct && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(next);
                }}
                className={actionBtn}
              >
                {next === 'acknowledged' ? 'ack' : 'resolve'}
              </button>
            )
          )}
        </div>
      </div>
      {isOpen && (
        <div className="px-5 py-3 mono bg-vigil-panel">
          <p className="text-[11px] tracking-wide text-vigil-muted mb-2 whitespace-pre-wrap">
            {alert.llm_analysis ?? 'The AI analysis is not ready yet.'}
          </p>
          <AskAIButton onClick={() => openAI(alert.id)} />
        </div>
      )}
    </div>
  );
}
