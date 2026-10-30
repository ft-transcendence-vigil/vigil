interface Data {
  text: string;
  isError?: boolean;
}

export default function StateMessage({ text, isError }: Data) {
  return (
    <p
      className={`col-span-full border border-vigil-border bg-vigil-card py-6 text-center text-[13px] ${
        isError ? 'text-red-400' : 'text-vigil-muted'
      }`}
    >
      {text}
    </p>
  );
}
