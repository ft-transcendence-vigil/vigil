import { useState } from 'react';
import Button from '../shared/Button';

interface Data {
  title: string;
  value: string;
  showValidationBtn?: boolean;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: () => void;
  disabled?: boolean;
}

export default function ChangePassword({
  title,
  value,
  showValidationBtn = false,
  error = '',
  onChange,
  onClick,
  disabled = false,
}: Data) {
  const [showPassword, setShowPassword] = useState(false);

  const handleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };
  return (
    <div>
      <h6 className="mb-2 text-vigil-muted-extra uppercase text-[13px]">
        {title}
      </h6>
      <div className="flex items-center space-x-3">
        <div className="input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            value={value}
            placeholder="••••••••••"
            onChange={onChange}
            className={`outline-none px-4 py-3 w-full focus:border-vigil-blue border border-vigil-border placeholder:text-vigil-muted ${
              error ? 'border! border-red-400! focus:outline-0!' : ''
            }`}
          />
          <span className="show-btn" onClick={handleShowPassword}>
            {showPassword ? 'hide' : 'show'}
          </span>
        </div>
        {showValidationBtn && (
          <Button value="save" onClick={onClick} disabled={disabled} />
        )}
      </div>
      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
    </div>
  );
}
