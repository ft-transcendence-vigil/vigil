import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Data {
  url: string;
  onDelete: () => void;
}

export default function WebhookRow({ url, onDelete }: Data) {
  return (
    <tr className="border-b border-vigil-border hover:bg-vigil-row-hover transition-colors duration-200">
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
        {url}
      </td>
      <td className="py-2 md:py-3 px-2 md:px-3 space-x-2">
        <button
          onClick={onDelete}
          className="text-[11px] md:text-[13px] cursor-pointer border border-vigil-state-danger/40 w-8 h-8 text-vigil-state-danger/70 hover:border-vigil-state-danger/80 hover:text-vigil-state-danger/80 transition-[color,border-color] duration-200"
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </td>
    </tr>
  );
}
