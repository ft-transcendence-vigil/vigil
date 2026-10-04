interface AIPanelProps {
  onClose: () => void;
}

export default function AIPanel({ onClose }: AIPanelProps) {
  return (
    <div className="ai-panel z-50 flex flex-col space-y-4 h-screen">
      <div className="header px-4 py-4.5 md:py-6 flex justify-between border-b border-b-vigil-border">
        <p className="font-medium tracking-wide">✦ AI assistant</p>
        <button
          type="button"
          onClick={onClose}
          className="uppercase border border-[#6b7da84e] text-[10px] tracking-widest px-2 text-vigil-muted cursor-pointer hover:opacity-70 duration-300 transition-opacity"
        >
          Close
        </button>
      </div>
      <div className="body px-4 flex-1 border-b mb-0 border-b-[#6b7da84e]">
        <p className="ai-response text-[13px] text-[#e8f0ff] border border-vigil-border px-4 py-2 tracking-wide bg-[#0d1320]">
          Ask about your alerts or services. I only see this conversation, so I
          include alert details when you ask about one.
        </p>
      </div>
      <div className="footer flex justify-between space-x-4 px-4 py-3">
        <input
          placeholder="Ask about your data…"
          className="placeholder:text-vigil-muted outline-none w-full text-[13px] p-2 border border-[#6b7da84e] focus:border-vigil-blue"
        />
        <button
          type="button"
          className="uppercase text-[12px] tracking-widest font-bold px-2 py-3 text-black bg-vigil-blue cursor-pointer hover:opacity-70 transition-opacity duration-300"
        >
          send
        </button>
      </div>
    </div>
  );
}
