import { useEffect, useState } from 'react';
import CardLayout from '../../components/Settings/CardLayout';
import SessionCard from '../../components/Settings/SessionCard';
import useSessions from '../../hooks/useSessions';

export default function SessionsSettings() {
  const [now, setNow] = useState(() => Date.now());
  const { sessions, handleRevokeSession } = useSessions();
  const sortedSessions = [...sessions].sort(
    (a, b) => Number(b.current) - Number(a.current),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="sessions-settings flex flex-col space-y-5">
      <CardLayout title="Sessions" description="Manage where you're logged in.">
        <div className="flex flex-col space-y-5">
          {sortedSessions.map((session) => (
            <SessionCard
              key={session.id}
              id={session.id}
              user_agent={session.user_agent}
              ip_address={session.ip_address}
              last_used_at={session.last_used_at}
              current={session.current}
              now={now}
              onRevoke={handleRevokeSession}
            />
          ))}
        </div>
      </CardLayout>
    </div>
  );
}
