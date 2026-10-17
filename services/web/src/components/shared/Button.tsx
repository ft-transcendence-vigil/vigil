interface Data {
  value: string | null;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function Button({ value, onClick, disabled = false, className }: Data) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer uppercase text-[12px] md:text-[13px] lg:text-[14px] font-medium tracking-wide py-3 px-5 text-black bg-vigil-blue hover:opacity-70 transition-opacity duration-300 ${className}`}
    >
      {value}
    </button>
  );
}
