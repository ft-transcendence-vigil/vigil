interface Data {
  value: string;
  disabled: boolean
}

export default function FormButton({ value, disabled }: Data) {
  return <input type="submit" value={value} disabled={disabled}/>;
}
