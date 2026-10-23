import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/authContext';
import {
  addAlertRule,
  updateAlertRule,
  getAllAlertRules,
  type AlertRules,
  type UpdateAlertRules,
} from '../api/alertRulesApi';
import { toast } from 'sonner';

type AlertRulesOptions =
  | {
      mode: 'create';
      rule?: never;
      onCreated?: () => void;
      onUpdated?: () => void;
    }
  | {
      mode: 'edit';
      rule: AlertRules;
      onCreated?: () => void;
      onUpdated?: () => void;
    };

type CreateAlertRule = Parameters<typeof addAlertRule>[1];
type SignalType = AlertRules['signal_type'];
type Severity = AlertRules['severity'];
type Aggregation = NonNullable<AlertRules['aggregation']>;

const METRIC_NAMES: Record<'logs' | 'traces', string[]> = {
  logs: ['error_count', 'warning_count', 'critical_count', 'total_count'],
  traces: [
    'error_rate',
    'span_count',
    'avg_duration_ms',
    'p50_duration_ms',
    'p95_duration_ms',
    'p99_duration_ms',
    'max_duration_ms',
  ],
};

const MIN_WINDOW_SECONDS = 10;
export const PAGE_SIZE = 10;

export default function useAlertRules({
  mode,
  rule,
  onCreated,
  onUpdated,
}: AlertRulesOptions) {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';
  const isDefault = isEdit && rule.is_default;

  const [service, setService] = useState(isEdit ? rule.service : '');
  const [serviceError, setServiceError] = useState('');
  const [signalType, setSignalType] = useState<SignalType>(
    isEdit ? rule.signal_type : ('logs' as SignalType),
  );
  const [metricName, setMetricName] = useState(
    isEdit ? rule.metric_name : METRIC_NAMES.logs[0],
  );
  const [metricNameError, setMetricNameError] = useState('');
  const [aggregation, setAggregation] = useState<Aggregation>(
    isEdit && rule.aggregation ? rule.aggregation : ('latest' as Aggregation),
  );
  const [windowSeconds, setWindowSeconds] = useState(
    isEdit ? String(rule.window_seconds) : '',
  );
  const [windowSecondsError, setWindowSecondsError] = useState('');
  const [threshold, setThreshold] = useState(
    isEdit ? String(rule.threshold) : '',
  );
  const [thresholdError, setThresholdError] = useState('');
  const [severity, setSeverity] = useState<Severity>(
    isEdit ? rule.severity : ('warning' as Severity),
  );
  const [enabled, setEnabled] = useState(isEdit ? rule.enabled : true);
  const [formError, setFormError] = useState('');
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

  const addMutation = useMutation({
    mutationFn: (newRule: CreateAlertRule) => addAlertRule(apiFetch, newRule),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['alert-rules'],
      });

      toast.success('Alert rule added successfully');
      onCreated?.();
    },

    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (changes: UpdateAlertRules) => {
      if (mode !== 'edit') {
        throw new Error('No alert rule selected.');
      }

      return updateAlertRule(apiFetch, rule.id, changes);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['alert-rules'],
      });

      toast.success('Alert rule updated successfully');
      onUpdated?.();
    },

    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    },
  });

  const isFormSubmitting = addMutation.isPending || updateMutation.isPending;

  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDefault) return;
    setService(e.target.value);
    setServiceError('');
    setFormError('');
  };

  const handleSignalTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isEdit) return;
    const next = e.target.value as SignalType;
    setSignalType(next);
    setMetricName(
      next === 'metrics' ? '' : METRIC_NAMES[next as 'logs' | 'traces'][0],
    );
    setAggregation('latest' as Aggregation);
    setMetricNameError('');
    setFormError('');
  };

  const handleMetricNameChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (isDefault) return;
    setMetricName(e.target.value);
    setMetricNameError('');
    setFormError('');
  };

  const handleAggregationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isDefault) return;
    setAggregation(e.target.value as Aggregation);
    setFormError('');
  };

  const handleWindowSecondsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (isDefault) return;
    setWindowSeconds(e.target.value);
    setWindowSecondsError('');
    setFormError('');
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDefault) return;
    setThreshold(e.target.value);
    setThresholdError('');
    setFormError('');
  };

  const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isDefault) return;
    setSeverity(e.target.value as Severity);
    setFormError('');
  };

  const handleEnabledChange = () => {
    setEnabled((prev) => !prev);
    setFormError('');
  };

  const validateForm = (): boolean => {
    let isValid = true;

    setServiceError('');
    setMetricNameError('');
    setWindowSecondsError('');
    setThresholdError('');
    setFormError('');

    if (isDefault) return true;

    if (service.trim().length === 0) {
      setServiceError('Service is required');
      isValid = false;
    }

    const name = metricName.trim();
    if (name.length === 0) {
      setMetricNameError('Metric name is required');
      isValid = false;
    } else if (
      signalType !== 'metrics' &&
      !METRIC_NAMES[signalType as 'logs' | 'traces'].includes(name)
    ) {
      setMetricNameError('Invalid metric for this signal type');
      isValid = false;
    }

    const w = Number(windowSeconds);
    if (windowSeconds.trim() === '') {
      setWindowSecondsError('Window is required');
      isValid = false;
    } else if (!Number.isInteger(w)) {
      setWindowSecondsError('Window must be a whole number');
      isValid = false;
    } else if (w < MIN_WINDOW_SECONDS) {
      setWindowSecondsError(
        `Window must be at least ${MIN_WINDOW_SECONDS} seconds`,
      );
      isValid = false;
    }

    if (threshold.trim() === '') {
      setThresholdError('Threshold is required');
      isValid = false;
    } else if (!Number.isFinite(Number(threshold))) {
      setThresholdError('Threshold must be a number');
      isValid = false;
    }

    return isValid;
  };

  const handleAddAlertRuleSubmit = () => {
    if (isEdit || isFormSubmitting || !validateForm()) return;

    const newRule: CreateAlertRule = {
      service: service.trim(),
      signal_type: signalType,
      metric_name: metricName.trim(),
      window_seconds: Number(windowSeconds),
      threshold: Number(threshold),
      severity,
      enabled,
      ...(signalType === 'metrics' ? { aggregation } : {}),
    };

    setFormError('');
    addMutation.mutate(newRule);
  };

  const handleEditAlertRuleSubmit = () => {
    if (mode !== 'edit') return;
    if (isFormSubmitting || !validateForm()) return;

    const changes: UpdateAlertRules = {};

    if (enabled !== rule.enabled) {
      changes.enabled = enabled;
    }

    if (!rule.is_default) {
      if (service.trim() !== rule.service) {
        changes.service = service.trim();
      }
      if (metricName.trim() !== rule.metric_name) {
        changes.metric_name = metricName.trim();
      }
      if (rule.signal_type === 'metrics' && aggregation !== rule.aggregation) {
        changes.aggregation = aggregation;
      }
      if (Number(windowSeconds) !== rule.window_seconds) {
        changes.window_seconds = Number(windowSeconds);
      }
      if (Number(threshold) !== rule.threshold) {
        changes.threshold = Number(threshold);
      }
      if (severity !== rule.severity) {
        changes.severity = severity;
      }
    }

    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save.');
      return;
    }

    setFormError('');
    updateMutation.mutate(changes);
  };

  return {
    alertRules: alertRulesQuery.data ?? [],
    alertRulesQuery,
    formError,
    isFormSubmitting,
    isDefault,
    metricOptions:
      signalType === 'metrics'
        ? null
        : METRIC_NAMES[signalType as 'logs' | 'traces'],
    showAggregation: signalType === 'metrics',
    handleAddAlertRuleSubmit,
    handleEditAlertRuleSubmit,
    service,
    serviceError,
    signalType,
    metricName,
    metricNameError,
    aggregation,
    windowSeconds,
    windowSecondsError,
    threshold,
    thresholdError,
    severity,
    enabled,
    offset,
    setOffset,
    handleServiceChange,
    handleSignalTypeChange,
    handleMetricNameChange,
    handleAggregationChange,
    handleWindowSecondsChange,
    handleThresholdChange,
    handleSeverityChange,
    handleEnabledChange,
  };
}
