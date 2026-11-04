import { useState } from 'react';
import type { AlertHistory, AlertStatus } from '../../api/alertHistoryApi';
import { severityColors, statusColors } from './colorsGuid';
import AlertsDetails from './AlertsDetails';
import formatLastActive from '../shared/utils/date';

type AlertAction = 'ack' | 'resolve' | 're-ack' | 'reopen';

export interface Data extends AlertHistory {
  isLive?: boolean;
  onStatusChange: (status: AlertStatus) => void;
  isUpdatingStatus: boolean;
  currentUserId?: string;
}

function getActions(status: AlertStatus): AlertAction[] {
  switch (status) {
    case 'sent':
      return ['ack', 'resolve'];
    case 'acknowledged':
      return ['re-ack', 'resolve', 'reopen'];
    case 'resolved':
      return ['ack', 'reopen'];
  }
}

function getStatusLabel(status: AlertStatus) {
  switch (status) {
    case 'sent':
      return 'Open';
    case 'acknowledged':
      return 'Acked';
    case 'resolved':
      return 'Resolved';
  }
}

const actionToStatus: Record<AlertAction, AlertStatus> = {
  ack: 'acknowledged',
  're-ack': 'acknowledged',
  resolve: 'resolved',
  reopen: 'sent',
};

export default function AlertsRow(props: Data) {
  const { isLive, onStatusChange, isUpdatingStatus, currentUserId, ...alert } =
    props;
  const [isOpen, setIsOpen] = useState(false);
  const {
    severity,
    service,
    metric_name,
    triggered_at,
    status,
    acked_by,
    resolved_by,
  } = alert;
  const levelColor = severityColors[severity];
  const statusColor = statusColors[status];
  const triggeredDate = new Date(triggered_at);
  const [now] = useState(() => Date.now());
  const diff = now - triggeredDate.getTime();
  const lastActive = formatLastActive(diff, triggeredDate);
  const metric =
    metric_name === 'service_silent' ? 'Service Silent' : metric_name;
  const actor =
    status === 'resolved'
      ? resolved_by
      : status === 'acknowledged'
        ? acked_by
        : null;
  const canAct =
    alert.owner_id === null ||
    (currentUserId !== undefined && alert.owner_id === currentUserId);
  const actions = canAct ? getActions(status) : [];

  return (
    <>
      <tr
        className={`border-b border-vigil-border hover:bg-[#0C1424] transition-colors duration-200 cursor-pointer relative after:absolute after:right-5 after:top-1/2 after:-translate-y-1/2 ${
          isOpen ? "after:content-['▴']" : "after:content-['▾']"
        } text-[12px] text-vigil-muted ${isLive ? 'animate-log-flash' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <td className="text-[12px] py-1 md:py-3 px-2 md:px-3 uppercase tracking-wider">
          <span className={`px-2 py-1.5 mono ${levelColor}`}>{severity}</span>
        </td>
        <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 text-white">
          {service}
        </td>
        <td
          className={`text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 ${
            metric_name === 'service_silent' ? 'text-[#f59e0b] italic' : ''
          }`}
        >
          {metric}
        </td>
        <td
          className="text-[#6b7da895] text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3"
          title={triggeredDate.toLocaleString()}
        >
          {lastActive}
        </td>
        <td className="text-[12px] py-1 md:py-3 px-2 md:px-3 uppercase tracking-wider">
          <span className={`px-2 py-1.5 mono ${statusColor}`}>
            {getStatusLabel(status)}
          </span>
          {actor && (
            <span className="text-vigil-muted ms-3 normal-case">{actor}</span>
          )}
        </td>
        <td className="text-[15px] py-1 md:py-3 px-2 md:px-3">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(actionToStatus[action]);
              }}
              disabled={isUpdatingStatus}
              className={`mx-1 border border-vigil-border capitalize tracking-wider px-2.5 py-1.5 cursor-pointer text-vigil-muted ${
                action === 'resolve'
                  ? 'hover:text-[#00d68f] hover:border-[#00d68f]'
                  : 'hover:text-vigil-blue hover:border-vigil-blue'
              } transition-[color,border-color] duration-300`}
            >
              {action}
            </button>
          ))}
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={6}>
            <AlertsDetails alert={alert} />
          </td>
        </tr>
      )}
    </>
  );
}
