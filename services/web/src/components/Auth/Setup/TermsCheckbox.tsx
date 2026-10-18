import { Link } from 'react-router-dom';

interface Props {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

const linkClass = 'text-blue-400 hover:underline';

export default function TermsCheckbox({ checked, onChange, error }: Props) {
  return (
    <div className="mb-8">
      <label className="flex items-start gap-3 text-sm text-vigil-muted cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 accent-vigil-blue"
          checked={checked}
          onChange={onChange}
        />
        <span>
          I agree to the{' '}
          <Link
            to="/legal#terms"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Terms of Service
          </Link>
          {' and '}
          <Link
            to="/legal#privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Privacy Policy
          </Link>
        </span>
      </label>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
