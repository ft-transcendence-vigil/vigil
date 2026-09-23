interface Data {
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export default function PasswordInput({ onChange }: Data) {
  return (
    <div className="input mb-6.25">
      <label htmlFor="password" className="text-vigil-muted block mb-2">
        Password
      </label>
      <div className="input-wrapper">
        <input
          type="password"
          name="password"
          id="password"
          placeholder="••••••••••"
          className="placeholder:text-vigil-muted"
          onChange={onChange}
        />
        <span className="show-btn">show</span>
      </div>
    </div>
  );
}
