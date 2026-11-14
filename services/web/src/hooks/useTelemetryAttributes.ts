import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/authContext';
import { getTelemetryAttributes } from '../api/telemetryAttributesApi';

export default function useTelemetryAttributes(enabled = true) {
  const { apiFetch } = useAuth();

  return useQuery({
    queryKey: ['telemetry-attributes'],
    queryFn: () => getTelemetryAttributes(apiFetch),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
