import SwitchButton from '../shared/SwitchButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';

import type { AlertRules } from '../../api/alertRulesApi';
import { colors } from './colorsGuid';

type Data = AlertRules & {
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
};

export default function AlertRulesRow({
  onEdit,
  onDelete,
  onToggle,
  ...rule
}: Data) {
  return (
    <tr className="border-b border-vigil-border hover:bg-[#0C1424] transition-colors duration-200">
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
        {rule.service}
      </td>
      <td className="text-[13px] py-1 md:py-3 px-2 md:px-3">
        <span className={`px-2 py-1 mono ${colors[rule.signal_type]}`}>
          {rule.signal_type}
        </span>
      </td>
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
        {rule.metric_name}
      </td>
      <td
        className={`${
          !rule.aggregation
            ? 'font-bold text-[17px]'
            : 'text-[14px] md:text-[16px]'
        } py-1 md:py-3 px-2 md:px-3 text-vigil-muted-extra`}
      >
        {rule.aggregation ? rule.aggregation : '_'}
      </td>
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
        {rule.window_seconds}
      </td>
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
        {rule.threshold}
      </td>
      <td className="text-[13px] py-1 md:py-3 px-2 md:px-3">
        <span className={`px-2 py-1 mono ${colors[rule.severity]}`}>
          {rule.severity}
        </span>
      </td>
      <td className="text-[13px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
        <SwitchButton
          checked={rule.enabled}
          onCheckedChange={() => onToggle(!rule.enabled)}
        />
      </td>
      <td className="text-[13px] py-1 md:py-3 px-2 md:px-3">
        <span
          className={`${
            rule.is_default
              ? 'bg-[#6b7da81a] border border-vigil-border-muted'
              : 'font-bold text-[17px]'
          } capitalize text-vigil-muted-extra px-2 py-1 mono`}
        >
          {rule.is_default ? 'default' : '_'}
        </span>
      </td>
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 space-x-2">
        <button
          title="Edit"
          onClick={onEdit}
          className="text-[10px] md:text-[12px] cursor-pointer border border-vigil-border w-8 h-8 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-200"
        >
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
        <button
          title={rule.is_default ? 'Default rules cannot be deleted' : 'Delete'}
          onClick={onDelete}
          disabled={rule.is_default}
          className="text-[10px] md:text-[12px] cursor-pointer border border-red-500/40 w-8 h-8 text-red-500/70 hover:border-red-500/80 hover:text-red-500/80 transition-[color,border-color] duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-red-500/40 disabled:hover:text-red-500/70"
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </td>
    </tr>
  );
}
