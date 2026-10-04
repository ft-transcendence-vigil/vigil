interface Data {
  title: string;
  className: string;
}

export default function Card({ title, className = '' }: Data) {
  return (
    <div
      className={`flex flex-col border border-vigil-border bg-vigil-card p-5 ${className}`}
    >
      <div className="mb-8 flex justify-between border-b border-vigil-border pb-4">
        <h2 className="text-[17px] font-medium tracking-wide">{title}</h2>
        <div className="flex gap-4 text-[11px] text-vigil-muted"></div>
      </div>
    </div>
  );
}
