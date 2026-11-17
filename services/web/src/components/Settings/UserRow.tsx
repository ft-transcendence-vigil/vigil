import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Data {
  email: string;
  role: 'admin' | 'viewer';
  isCurrent: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function UserRow({
  email,
  role,
  isCurrent,
  onEdit,
  onDelete,
}: Data) {
  return (
    <tr className="border-b border-vigil-border hover:bg-vigil-row-hover transition-colors duration-200">
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
        {email}
        {isCurrent && (
          <span className="ms-3 uppercase text-[10px] tracking-wider text-vigil-warning border border-vigil-warning-badge-border bg-vigil-warning-badge-bg px-2 py-1">
            you
          </span>
        )}
      </td>
      <td className="py-1 md:py-3 px-2 md:px-3">
        <span
          className={`uppercase text-[10px] md:text-[11px] tracking-wider block w-15 md:w-18 text-center py-1 md:py-1.5 ${
            role === 'admin'
              ? 'text-vigil-accent bg-vigil-accent-soft border border-vigil-state-info-text/20'
              : 'text-vigil-muted bg-vigil-muted-badge border border-vigil-text/10'
          }`}
        >
          {role}
        </span>
      </td>
      <td className="py-2 md:py-3 px-2 md:px-3 space-x-2">
        {!isCurrent && (
          <>
            <button
              onClick={onEdit}
              className="text-[11px] md:text-[13px] cursor-pointer border border-vigil-border w-8 h-8 text-vigil-muted hover:border-vigil-text/60 hover:text-vigil-text/60 transition-[color,border-color] duration-200"
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
            <button
              onClick={onDelete}
              className="text-[11px] md:text-[13px] cursor-pointer border border-vigil-state-danger/40 w-8 h-8 text-vigil-state-danger/70 hover:border-vigil-state-danger/80 hover:text-vigil-state-danger/80 transition-[color,border-color] duration-200"
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
