import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Data {
  email: string;
  role: 'admin' | 'viewer';
  onEdit: () => void;
  onDelete: () => void;
}

export default function UserRow({ email, role, onEdit, onDelete }: Data) {
  return (
    <tr className="border-b border-vigil-border hover:bg-[#0C1424] transition-colors duration-200">
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">{email}</td>
      <td className="py-1 md:py-3 px-2 md:px-3">
        <span
          className={`uppercase text-[10px] md:text-[11px] tracking-wider block w-15 md:w-18 text-center py-1 md:py-1.5 ${
            role === 'admin'
              ? 'text-vigil-blue bg-vigil-blue-100 border border-blue-400/20'
              : 'text-vigil-muted bg-[rgba(107,125,168,0.08)] border border-white/10'
          }`}
        >
          {role}
        </span>
      </td>
      <td className="py-2 md:py-3 px-2 md:px-3 space-x-2">
        <button
          onClick={onEdit}
          className="text-[11px] md:text-[13px] cursor-pointer border border-vigil-border w-8 h-8 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-200"
        >
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
        <button onClick={onDelete} className="text-[11px] md:text-[13px] cursor-pointer border border-red-500/40 w-8 h-8 text-red-500/70 hover:border-red-500/80 hover:text-red-500/80 transition-[color,border-color] duration-200">
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </td>
    </tr>
  );
}
