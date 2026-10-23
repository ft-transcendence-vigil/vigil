import { useId } from 'react';

interface Data {
  title: string;
  type: string;
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  error: string;
  className?: string;
  mb?: string;
}

export default function FormInput({
  title,
  type,
  placeholder,
  onChange,
  value,
  error,
  className,
  mb = 'mb-6.25',
}: Data) {
  const id = useId();
  return (
    <div className={`input ${mb}`}>
      <label htmlFor={id} className="text-vigil-muted block mb-2">
        {title}
      </label>
      <input
        type={type}
        name={type}
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={`placeholder:text-vigil-muted-extra ${error ? 'border! border-red-400! focus:outline-0!' : ''} ${className}`}
      />
      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
    </div>
  );
}
