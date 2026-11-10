import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Dropdown from '../shared/Dropdown';
import FormInput from '../shared/FormInput';

export type Period = '1h' | '24h' | '7d' | '30d' | '';

interface Props {
  period: Period;
  service: string;
  handlePeriodOnChange: React.ChangeEventHandler<HTMLSelectElement>;
  handleServiceOnChange: React.ChangeEventHandler<HTMLInputElement>;
  handleClear: () => void;
}

export default function AlertsFilters({
  period,
  service,
  handlePeriodOnChange,
  handleServiceOnChange,
  handleClear,
}: Props) {
  const isFiltered = period !== '24h' || service !== '';

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Dropdown
        options={[
          {
            label: 'Last hour',
            value: '1h',
          },
          {
            label: 'Last 24 hours',
            value: '24h',
          },
          {
            label: 'Last 7 days',
            value: '7d',
          },
          {
            label: 'Last 30 days',
            value: '30d',
          },
          {
            label: 'All time',
            value: '',
          },
        ]}
        value={period}
        onChange={handlePeriodOnChange}
        className="bg-[#0D1425]"
        mb="mb-0"
      />
      <div className="w-120">
        <FormInput
          type="text"
          placeholder="Filter by service"
          value={service}
          onChange={handleServiceOnChange}
          className="w-full border border-vigil-border bg-[#0D1425] px-4 py-2.5 outline-none focus:border-vigil-blue"
          error=""
          mb="mb-0"
        />
      </div>
      {isFiltered && (
        <button
          type="button"
          onClick={handleClear}
          className="cursor-pointer ml-auto flex items-center gap-1.5 text-[14px] tracking-[.4px] text-vigil-blue hover:underline"
        >
          <FontAwesomeIcon className="text-[12px]" icon={faXmark} />
          Clear all
        </button>
      )}
    </div>
  );
}
