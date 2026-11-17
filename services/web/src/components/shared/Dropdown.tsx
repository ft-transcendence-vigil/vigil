type DropdownOption = string | { label: string; value: string };

interface Data {
  title?: string;
  options: DropdownOption[];
  value?: string;
  disabled?: boolean;
  className?: string;
  mb?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function Dropdown({
  title,
  options,
  value,
  onChange,
  disabled,
  className,
  mb = 'mb-3.5',
}: Data) {
  return (
    <div className={mb}>
      {title && (
        <label
          htmlFor="role"
          className="block mb-2 text-vigil-muted capitalize"
        >
          {title}
        </label>
      )}
      <select
        id="role"
        name="role"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`capitalize outline-none px-4 py-3 w-full border border-vigil-border focus:border-vigil-accent disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {options.map((option) => {
          const label = typeof option === 'string' ? option : option.label;
          const value = typeof option === 'string' ? option : option.value;
          return (
            <option
              key={label}
              value={value}
              className="bg-vigil-card capitalize"
            >
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
