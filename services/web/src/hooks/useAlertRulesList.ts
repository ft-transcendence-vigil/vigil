import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getAllAlertRules } from '../api/alertRulesApi';
import { useAuth } from '../auth/authContext';

export const PAGE_SIZE = 10;

export default function useAlertRulesList() {
  const { apiFetch } = useAuth();
  const [offset, setOffset] = useState(0);

  const alertRulesQuery = useQuery({
    queryKey: ['alert-rules', PAGE_SIZE, offset],

    queryFn: () =>
      getAllAlertRules(apiFetch, {
        count: PAGE_SIZE,
        offset,
      }),
    staleTime: 5 * 60_000,
  });

  return {
    alertRules: alertRulesQuery.data ?? [],
    alertRulesQuery,
    offset,
    setOffset,
  };
}
