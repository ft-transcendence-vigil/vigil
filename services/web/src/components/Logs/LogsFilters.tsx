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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-center">
      <Dropdown
        options={[
          { label: 'Last 1h', value: '1h' },
          { label: 'Last 24h', value: '24h' },
          { label: 'Last 7d', value: '7d' },
          { label: 'Last 30d', value: '30d' },
        ]}
        value={filter.period}
        onChange={filter.handlePeriodOnChange}
        className="bg-[#0D1425] w-full min-w-0"
        mb="mb-0"
      />
      <FormInput
        type="text"
        placeholder="Service"
        value={filter.service}
        onChange={filter.handleServiceOnChange}
        className="outline-none px-4 py-2.5 w-full min-w-0 border border-vigil-border focus:border-vigil-blue bg-[#0D1425]"
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
        className="bg-[#0D1425] w-full min-w-0"
        mb="mb-0"
      />
      <FormInput
        type="text"
        placeholder="Search message text"
        value={filter.search}
        onChange={filter.handleSearchOnChange}
        className="outline-none px-4 py-2.5 w-full min-w-0 border border-vigil-border focus:border-vigil-blue bg-[#0D1425]"
        error=""
        mb="mb-0"
      />
      <Dropdown
        options={[
          { label: 'Newest first', value: 'timestamp' },
          { label: 'Service A-Z', value: 'service' },
          { label: 'Severity A-Z', value: 'severity' },
          { label: 'Message A-Z', value: 'message' },
        ]}
        value={filter.sort}
        onChange={filter.handleSortOnChange}
        className="bg-[#0D1425] w-full min-w-0"
        mb="mb-0"
      />
    </div>
  );
}
