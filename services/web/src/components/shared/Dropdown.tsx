interface Data {
  title: string;
  options: string[];
  value?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function Dropdown({
  title,
  options,
  value,
  onChange,
  disabled,
}: Data) {
  return (
    <div className="mb-3.5">
      <label htmlFor="role" className="block mb-2 text-vigil-muted capitalize">
        {title}
      </label>
      <select
        id="role"
        name="role"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="capitalize outline-none px-4 py-3 w-full border border-vigil-border focus:border-vigil-blue disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-vigil-card capitalize"
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
