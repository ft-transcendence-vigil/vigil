interface Data {
  title: string;
  options: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function Dropdown({ title, options, value, onChange }: Data) {
  return (
    <div className="mb-6.25">
      <label htmlFor="role" className="block mb-2 text-vigil-muted capitalize">
        {title}
      </label>
      <select
        id="role"
        name="role"
        value={value}
        onChange={onChange}
        className="capitalize outline-none px-4 py-3 w-full border border-vigil-border focus:border-vigil-blue"
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
