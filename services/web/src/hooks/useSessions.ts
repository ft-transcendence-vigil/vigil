import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/authContext';
import { getAllSessions, revokeSession } from '../api/sessionsApi';
import { toast } from 'sonner';

export default function useSessions() {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => getAllSessions(apiFetch),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeSession(apiFetch, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['sessions'],
      });
      toast.success('Session revoked');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to revoke sessions',
      );
    },
  });

  return {
    sessions: sessionsQuery.data ?? [],
    error: sessionsQuery.error,
    revokeSession: revokeMutation.mutate,
    isRevoking: revokeMutation.isPending,
  };
}
