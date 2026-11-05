import type { AlertNotification } from '../../api/alertNotificationsApi';

type Severity = AlertNotification['severity'];

interface Data {
  notification: AlertNotification;
  onOpen: (id: string) => void;
  onToggleSeen: (id: string, seen: boolean) => void;
  isUpdating: boolean;
}

const severityStyle: Record<Severity, { bar: string; text: string }> = {
  critical: {
    bar: 'bg-[#ff4757]',
    text: 'text-[#ff4757]',
  },
  warning: {
    bar: 'bg-[#f59e0b]',
    text: 'text-[#f59e0b]',
  },
  info: {
    bar: 'bg-[#6b7da8]',
    text: 'text-[#6b7da8]',
  },
};

function timeAgo(iso: string) {
  const s = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );

  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;

  return `${Math.floor(s / 86400)}d`;
}

export default function AlertNotificationRow({
  notification,
  onOpen,
  onToggleSeen,
  isUpdating,
}: Data) {
  const style = severityStyle[notification.severity];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(notification.alert_history_id)}
      className={`group relative cursor-pointer border-b border-vigil-border py-3 pr-4 pl-4.75 transition-colors hover:bg-[#63b3ed0d] ${
        notification.seen
          ? 'text-vigil-muted-extra'
          : 'bg-[#00e5ff0a] text-white'
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-0.75 ${style.bar} ${
          notification.seen ? 'opacity-35' : ''
        }`}
      />
      <div className="flex items-center justify-between gap-3">
        <span
          className={`truncate text-[.8rem] ${
            notification.seen ? 'font-medium' : 'font-semibold'
          }`}
        >
          {notification.service}
        </span>
        <span className="shrink-0 text-[.7rem] text-vigil-muted">
          {timeAgo(notification.triggered_at)}
        </span>
      </div>
      <div className="mt-1.5 flex min-h-4.5 items-center justify-between gap-3 text-[.67rem]">
        <span>
          <span
            className={`font-semibold tracking-[.5px] uppercase ${style.text}`}
          >
            {notification.severity}
          </span>
          <span className="mx-1.5 text-vigil-muted">·</span>
          {notification.signal_type ?? 'silence'}
        </span>
        <button
          type="button"
          disabled={isUpdating}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSeen(notification.alert_history_id, !notification.seen);
          }}
          className="cursor-pointer border border-vigil-border px-1.75 py-0.5 text-[.6rem] text-vigil-muted-extra opacity-0 transition-opacity group-hover:opacity-100 hover:border-vigil-blue hover:text-vigil-blue focus-visible:opacity-100 disabled:cursor-default disabled:opacity-50 [@media(hover:none)]:opacity-100"
        >
          {isUpdating
            ? 'Updating...'
            : notification.seen
              ? 'Mark unseen'
              : 'Mark seen'}
        </button>
      </div>
    </div>
  );
}
