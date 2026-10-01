export default function AskAIButton() {
  const handleAskAI = async () => {
    console.log('ASK AI');
  };
  return (
    <button
      onClick={handleAskAI}
      className="cursor-pointer uppercase text-[12px] font-bold tracking-wide py-1 px-2 text-black bg-vigil-blue border hover:opacity-70 transition-opacity duration-300"
    >
      ✦ ask ai
    </button>
  );
}
