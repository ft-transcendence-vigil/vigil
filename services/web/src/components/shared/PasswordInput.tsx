import { useId, useState } from 'react';

interface Data {
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  error: string | undefined;
  title?: string;
}

export default function PasswordInput({ onChange, error, title }: Data) {
  const [showPassword, setShowPassword] = useState(false);

  const handleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const id = useId();
  return (
    <div className="input mb-6.25">
      <label htmlFor={id} className="text-vigil-muted block mb-2">
        {title ?? 'Password'}
      </label>
      <div className="input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          name="password"
          id={id}
          placeholder="••••••••••"
          className={`placeholder:text-vigil-muted ${error ? 'border! border-red-400! focus:outline-0!' : ''}`}
          onChange={onChange}
        />
        <span className="show-btn" onClick={handleShowPassword}>
          {showPassword ? 'hide' : 'show'}
        </span>
      </div>
      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
    </div>
  );
}
