import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/authContext';
import { getApiKeys } from '../api/apiKeyApi';

export default function useApiKeySettings() {
  const { apiFetch } = useAuth();

  const apiKeysQuery = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => getApiKeys(apiFetch),
    staleTime: 60_000,
  });
  return {
    apiKeys: apiKeysQuery.data,
    error: apiKeysQuery.error,
  };
}
