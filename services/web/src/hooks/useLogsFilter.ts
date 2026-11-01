import { useEffect, useState } from 'react';
import type { LogsParams, Period } from '../api/logsApi';

export default function useLogsFilter() {
  const [period, setPeriod] = useState<Period | ''>('');
  const [service, setService] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timeout);
  }, [search]);

  const handlePeriodOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriod(e.target.value as Period);
  };

  const handleServiceOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setService(e.target.value);
  };

  const handleSearchOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSortOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
  };

  const handleSeverityOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeverity(e.target.value);
  };

  const params: LogsParams = {
    period: period || undefined,
    service: service || undefined,
    severity: severity || undefined,
    search: debouncedSearch || undefined,
    sort: sort || undefined,
  };

  return {
    handlePeriodOnChange,
    handleServiceOnChange,
    handleSeverityOnChange,
    handleSearchOnChange,
    handleSortOnChange,
    period,
    service,
    severity,
    search,
    sort,
    params,
  };
}
