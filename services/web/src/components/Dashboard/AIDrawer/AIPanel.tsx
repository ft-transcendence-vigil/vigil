import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useAIDrawer } from '../../../hooks/useAIDrawer';
import { useAlertAsk } from '../../../hooks/useAlertAsk';

interface AIPanelProps {
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIPanel({ onClose }: AIPanelProps) {
  const { answer, isPending, error, askAsync, clearAnswer, abort } =
    useAlertAsk();
  const { alertId } = useAIDrawer();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const handleQuestionOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuestion(event.target.value);
  };

  const handleSend = async () => {
    const value = question.trim();

    if (!value || !alertId || isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: value,
      },
    ]);
    setQuestion('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    try {
      const finalAnswer = await askAsync({ alertId, question: value });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: finalAnswer,
        },
      ]);
      clearAnswer();
    } catch {
      // ignore
    }
  };

  const handleClose = () => {
    abort();
    onClose();
  };

  function handleSuggestionClick(suggestion: string) {
    setQuestion(suggestion);
  }

  function handleQuestionKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      handleSend();
    }
  }

  useEffect(() => {
    inputRef.current?.focus();
  });

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: 'auto',
      block: 'end',
    });
  }, [messages, answer, error]);

  return (
    <div className="ai-panel z-50 flex flex-col space-y-4 h-screen">
      <div className="header px-3 py-4.5 md:py-6 flex justify-between border-b border-b-vigil-border mb-0">
        <p className="font-medium tracking-wide">✦ AI assistant</p>
        <button
          type="button"
          onClick={handleClose}
          className="uppercase border border-[#6b7da84e] text-[10px] tracking-widest px-2 text-vigil-muted cursor-pointer hover:opacity-70 duration-300 transition-opacity"
        >
          Close
        </button>
      </div>
      <div className="body p-3 flex-1 border-b mb-0 border-b-[#6b7da84e] space-y-2.5 overflow-y-auto">
        {messages.length === 0 && (
          <>
            <p className="ai-response text-[13px] text-[#e8f0ff] border border-vigil-border px-4 py-2 tracking-wide bg-[#0d1320]">
              What would you like to know about this alert?
            </p>
            <div className="flex justify-between">
              <button
                onClick={() => handleSuggestionClick('Why did this fire?')}
                className="cursor-pointer text-[13px] border border-vigil-border py-2 px-4 tracking-wider text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300"
              >
                Why did this fire?
              </button>
              <button
                onClick={() =>
                  handleSuggestionClick('Is this a recurring pattern?')
                }
                className="cursor-pointer text-[13px] border border-vigil-border py-2 px-4 tracking-wider text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300"
              >
                Is this a recurring pattern?
              </button>
              <button
                onClick={() => handleSuggestionClick('Suggest a fix')}
                className="cursor-pointer text-[13px] border border-vigil-border py-2 px-4 tracking-wider text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300"
              >
                Suggest a fix
              </button>
            </div>
          </>
        )}
        {messages.map((message) => (
          <p
            key={message.id}
            className={`wrap-break-word text-[14px] text-[#e8f0ff] border border-vigil-border px-4 py-2.5 tracking-wide w-fit max-w-[90%] ${message.role === 'assistant' ? 'bg-[#0d1320]' : 'bg-vigil-blue/80 ms-auto'}`}
          >
            {message.content}
          </p>
        ))}
        {answer && (
          <p className="wrap-break-word text-[14px] text-[#e8f0ff] border border-vigil-border px-4 py-2.5 tracking-wide bg-[#0d1320] w-fit max-w-[90%] whitespace-pre-wrap">
            {answer}
          </p>
        )}
        {isPending && !answer && (
          <p className="text-[14px] text-vigil-muted px-4 py-2.5 tracking-wide">
            ✧˖° Thinking...
          </p>
        )}
        {error && (
          <p className="wrap-break-word text-[14px] text-red-400 border px-4 py-2.5 tracking-wide w-fit max-w-[90%] whitespace-pre-wrap bg-red-400/10">
            {error.message}
          </p>
        )}
        <div ref={messageEndRef} />
      </div>
      <div className="footer flex justify-between space-x-4 py-4 px-3">
        <input
          ref={inputRef}
          placeholder="Ask about your data…"
          onChange={handleQuestionOnChange}
          onKeyDown={handleQuestionKeyDown}
          value={question}
          maxLength={500}
          className="placeholder:text-vigil-muted outline-none w-full text-[13px] p-2 border border-[#6b7da84e] focus:border-vigil-blue"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!question.trim() || isPending}
          className="uppercase text-[12px] tracking-widest font-bold px-2 py-3.5 text-black bg-vigil-blue cursor-pointer hover:opacity-70 transition-opacity duration-300"
        >
          send
        </button>
      </div>
    </div>
  );
}
