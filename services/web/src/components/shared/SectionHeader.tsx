interface Data {
  title: string;
  caption: string;
}

export default function SectionHeader({ title, caption }: Data) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
      <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">
        {title}
      </h2>
      <span className="text-[11px] text-vigil-muted-extra">{caption}</span>
    </div>
  );
}
