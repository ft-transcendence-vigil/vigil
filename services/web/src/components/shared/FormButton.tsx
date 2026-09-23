interface Data {
  value: string;
}

export default function FormButton({ value }: Data) {
  return <input type="submit" value={value} />;
}
