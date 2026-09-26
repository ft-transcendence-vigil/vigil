import { useId } from 'react';

interface Data {
  title: string;
  type: string;
  placeholder: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  error: string;
}

export default function FormInput({
  title,
  type,
  placeholder,
  onChange,
  error,
}: Data) {
  const id = useId();
  return (
    <div className="input mb-6.25">
      <label htmlFor={id} className="text-vigil-muted block mb-2">
        {title}
      </label>
      <input
        type={type}
        name={type}
        id={id}
        placeholder={placeholder}
        onChange={onChange}
        className={`placeholder:text-vigil-muted ${error ? 'border! border-red-400! focus:outline-0!' : ''}`}
      />
      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
    </div>
  );
}
