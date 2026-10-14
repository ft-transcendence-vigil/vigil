import type { Session } from '../../api/sessionsApi';
import parseUserAgent from '../shared/utils/parseUserAgent';
import SessionIcon from './SessionIcon';
import formatLastActive from '../shared/utils/date';

interface Data extends Session {
  now: number;
  onRevoke: (id: string) => Promise<void>;
}

export default function SessionCard({
  current,
  id,
  user_agent,
  ip_address,
  last_used_at,
  now,
  onRevoke,
}: Data) {
  const userAgent = parseUserAgent(user_agent);
  const lastUsed = new Date(last_used_at);
  const diff = now - lastUsed.getTime();
  const lastActive = formatLastActive(diff, lastUsed);

  return (
    <div
      className={`flex justify-between items-center border p-5 ${current ? 'border-blue-500/40' : 'border-vigil-border'}`}
      id={id}
    >
      <div className="left-section flex items-center">
        <SessionIcon device={userAgent.device} current={current} />
        <div>
          <div className="flex items-center mb-1 text-[18px]">
            {userAgent.browser} {userAgent.os}
            {current && (
              <span className="uppercase text-[11px] tracking-wider px-3 py-1.5 ms-5 text-vigil-blue bg-vigil-blue-100 border border-blue-400/20">
                this device
              </span>
            )}
          </div>
          <span className="text-vigil-muted text-[15px]">
            {ip_address} · Last active {lastActive}
          </span>
        </div>
      </div>
      {!current && (
        <button
          className="outline-none text-[12px] tracking-widest uppercase p-3 border border-red-500/30  text-red-500/80 cursor-pointer hover:border-red-500/60 hover:text-red-500 transition-[border, text] duration-300"
          type="button"
          onClick={() => onRevoke(id)}
        >
          revoke
        </button>
      )}
    </div>
  );
}
