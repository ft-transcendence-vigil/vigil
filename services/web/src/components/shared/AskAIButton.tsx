interface Data {
  onClick: () => void;
  className?: string;
}

export default function AskAIButton({ onClick, className }: Data) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border border-vigil-border uppercase text-[10px] tracking-wider py-1.5 w-18 cursor-pointer text-vigil-muted hover:text-vigil-text-hover hover:border-vigil-border-hover transition-[color, border-color] duration-300 ${className}`}
    >
      ✦ ask ai
    </button>
  );
}
