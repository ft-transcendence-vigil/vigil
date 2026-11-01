import type { Period } from '../../api/logsApi';
import Dropdown from '../shared/Dropdown';
import FormInput from '../shared/FormInput';

interface Data {
  period: Period | '';
  service: string;
  severity: string;
  search: string;
  sort: string;
  handlePeriodOnChange: React.ChangeEventHandler<HTMLSelectElement>;
  handleServiceOnChange: React.ChangeEventHandler<HTMLInputElement>;
  handleSeverityOnChange: React.ChangeEventHandler<HTMLSelectElement>;
  handleSearchOnChange: React.ChangeEventHandler<HTMLInputElement>;
  handleSortOnChange: React.ChangeEventHandler<HTMLSelectElement>;
}

export default function LogsFilters(filter: Data) {
  return (
    <div className="flex items-center space-x-4">
      <Dropdown
        options={[
          { label: 'Last 1h', value: '1h' },
          { label: 'Last 24h', value: '24h' },
          { label: 'Last 7d', value: '7d' },
          { label: 'Last 30d', value: '30d' },
        ]}
        value={filter.period}
        onChange={filter.handlePeriodOnChange}
        className="bg-[#0D1425]"
        mb="mb-0"
      />
      <FormInput
        type="text"
        placeholder="Service"
        onChange={filter.handleServiceOnChange}
        className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue bg-[#0D1425]"
        error=""
        mb="mb-0"
      />
      <Dropdown
        options={[
          { label: 'All severities', value: '' },
          { label: 'Critical', value: 'critical' },
          { label: 'Error', value: 'error' },
          { label: 'Warning', value: 'warning' },
          { label: 'Info', value: 'info' },
        ]}
        value={filter.severity}
        onChange={filter.handleSeverityOnChange}
        className="bg-[#0D1425]"
        mb="mb-0"
      />
      <div className="flex-1">
        <FormInput
          type="text"
          placeholder="Search message text"
          onChange={filter.handleSearchOnChange}
          className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue bg-[#0D1425]"
          error=""
          mb="mb-0"
        />
      </div>
      <Dropdown
        options={[
          { label: 'Newest first', value: 'timestamp' },
          { label: 'Service A-Z', value: 'service' },
          { label: 'Severity A-Z', value: 'severity' },
          { label: 'Message A-Z', value: 'message' },
        ]}
        value={filter.sort}
        onChange={filter.handleSortOnChange}
        className="bg-[#0D1425]"
        mb="mb-0"
      />
    </div>
  );
}
