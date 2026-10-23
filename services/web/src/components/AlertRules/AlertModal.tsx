import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FormInput from '../shared/FormInput';
import Button from '../shared/Button';
import Dropdown from '../shared/Dropdown';
import SwitchButton from '../shared/SwitchButton';
import type { AlertRules } from '../../api/alertRulesApi';
import useAlertRules from '../../hooks/useAlertRules';

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

type Data = AlertRulesOptions & {
  onClose: () => void;
};

export default function AlertModal(props: Data) {
  const form = useAlertRules(props);
  const { mode, onClose } = props;
  const isEdit = mode === 'edit';

  return (
    <div className="bg-[#050810b3] backdrop-blur-sm z-98 fixed inset-0">
      <div className="flex flex-col bg-vigil-card border border-vigil-border w-[95%] md:w-130 h-fit center-absolute z-99">
        <div className="flex items-center justify-between border-b border-b-vigil-border px-6 py-3.5">
          <h1 className="text-[18px]">
            {isEdit ? 'Edit Rule' : 'Create Rule'}
          </h1>
          <button
            onClick={onClose}
            className="text-[11px] p-2.5 outline-none border border-vigil-border cursor-pointer text-vigil-muted hover:border-white/20 hover:text-white/70 transition[border-color, color] duration-200"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="px-6 py-5 flex-1">
          {form.isDefault && (
            <p className="mb-3.5 text-[13px] text-vigil-muted-extra">
              Default rule: only “Enabled” can be changed.
            </p>
          )}
          <FormInput
            mb="mb-3.5"
            title="Service"
            type="text"
            error={form.serviceError}
            onChange={form.handleServiceChange}
            value={form.service}
            placeholder="e.g. payments-api"
            className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue"
          />
          <Dropdown
            title="Signal Type"
            options={['logs', 'metrics', 'traces']}
            onChange={form.handleSignalTypeChange}
            value={form.signalType}
            disabled={isEdit}
          />
          {form.metricOptions ? (
            <Dropdown
              title="Metric Name"
              options={form.metricOptions}
              onChange={form.handleMetricNameChange}
              value={form.metricName}
            />
          ) : (
            <FormInput
              mb="mb-3.5"
              title="Metric Name"
              type="text"
              error={form.metricNameError}
              onChange={form.handleMetricNameChange}
              value={form.metricName}
              placeholder="e.g. http.server.duration"
              className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue"
            />
          )}
          {form.showAggregation && (
            <Dropdown
              title="Aggregation"
              options={[
                'latest',
                'avg',
                'sum',
                'min',
                'max',
                'count',
                'p50',
                'p95',
                'p99',
              ]}
              onChange={form.handleAggregationChange}
              value={form.aggregation}
            />
          )}
          <div className="flex items-center space-x-4">
            <FormInput
              mb="mb-3.5"
              title="Window (seconds)"
              type="number"
              error={form.windowSecondsError}
              onChange={form.handleWindowSecondsChange}
              value={form.windowSeconds}
              className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue"
            />
            <FormInput
              mb="mb-3.5"
              title="Threshold"
              type="number"
              error={form.thresholdError}
              onChange={form.handleThresholdChange}
              value={form.threshold}
              className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue"
            />
          </div>
          <div className="text-vigil-muted-extra text-[13px] -mt-2.5 mb-2.5 tracking-wide">
            Fires when the window aggregate is ≥ threshold.
          </div>
          <Dropdown
            title="Severity"
            options={['info', 'warning', 'critical']}
            onChange={form.handleSeverityChange}
            value={form.severity}
          />
          <div className="flex items-center mt-5">
            <SwitchButton
              checked={form.enabled}
              onCheckedChange={form.handleEnabledChange}
            />
            <span className="text-vigil-muted ms-3 uppercase tracking-wide text-[14px]">
              Enabled
            </span>
          </div>
          {form.formError && (
            <p className="mt-3 text-sm text-red-400">{form.formError}</p>
          )}
        </div>
        <div className="border-t border-t-vigil-border px-6 py-3.5 text-right space-x-3">
          <Button
            onClick={onClose}
            value="cancel"
            className="py-2.5! text-[13px]! text-vigil-muted! hover:border-white/20! hover:text-white/70! transition[border-color, color]! duration-200! bg-transparent! border border-vigil-border hover:opacity-100!"
          />
          <Button
            value={isEdit ? 'save' : 'create'}
            className="py-2.5! text-[13px]!"
            onClick={
              isEdit
                ? form.handleEditAlertRuleSubmit
                : form.handleAddAlertRuleSubmit
            }
            disabled={form.isFormSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
