interface Data {
  onClick: () => void;
}

export default function AskAIButton({ onClick }: Data) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer uppercase text-[10px] md:text-[11px] lg:text-[12px] font-bold tracking-wide py-1 px-2 text-black bg-vigil-blue border hover:opacity-70 transition-opacity duration-300"
    >
      ✦ ask ai
    </button>
  );
}
