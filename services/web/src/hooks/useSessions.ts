import { useEffect, useState } from 'react';
import {
  getAllSessions,
  revokeSession,
  type Session,
} from '../api/sessionsApi';
import { useAuth } from '../auth/authContext';
import { toast } from 'sonner';

export default function useSessions() {
  const { apiFetch } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchSessions = async () => {
      try {
        const data = await getAllSessions(apiFetch);
        if (!cancelled) setSessions(data);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error('Unable to fetch sessions.');
        }
      }
    };
    void fetchSessions();

    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const handleRevokeSession = async (id: string) => {
    try {
      await revokeSession(apiFetch, id);
      setSessions((prev) => prev.filter((session) => session.id !== id));
      toast.success('Session revoked');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Unable to revoke sessions.');
      }
    }
  };

  return { sessions, handleRevokeSession };
}
