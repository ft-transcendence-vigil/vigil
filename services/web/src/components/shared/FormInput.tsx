interface Data {
  title: string;
  type: string;
  placeholder: string;
}

export default function FormInput({ title, type, placeholder }: Data) {
  return (
    <div className="input mb-6.25">
      <label htmlFor="email" className="text-vigil-muted block mb-2">
        {title}
      </label>
      <input
        type={type}
        name={type}
        id={type}
        placeholder={placeholder}
        className="placeholder:text-vigil-muted"
      />
    </div>
  );
}
