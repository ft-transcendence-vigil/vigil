import {
  faCheck,
  faCopy,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';

interface Data {
  title: string;
  apiKey: string;
  info: string;
}

export default function ApiKeyCard({ title, apiKey, info }: Data) {
  const [showed, setShowed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);

    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  return (
    <div>
      <h1 className="text-vigil-muted text-[12px] md:text-[14px] uppercase">{title}</h1>
      <div className="bg-[#0d1426] flex justify-between items-center border border-vigil-border px-2 md:px-4 py-2.5 md:py-3.5 mt-2 mb-1">
        <p className={`mono text-[12px] md:text-[15px] ${!showed && 'blur-sm select-none'}`}>
          {apiKey}
        </p>
        <div className="flex items-center space-x-1 md:space-x-2">
          <button
            className="cursor-pointer px-2 md:px-3 py-1.5 border border-vigil-border text-vigil-muted text-[11px] md:text-[12px] hover:border-white/50 hover:text-white/60 transition-[color,border-color] duration-200"
            onClick={() => setShowed((prev) => !prev)}
          >
            {!showed ? (
              <FontAwesomeIcon icon={faEye} />
            ) : (
              <FontAwesomeIcon icon={faEyeSlash} />
            )}
          </button>
          <button
            className={`cursor-pointer px-2 md:px-3 py-1.5 text-[11px] md:text-[12px] border transition-[color,border-color] duration-100 ${!copied ? 'border-vigil-border text-vigil-muted hover:border-white/50 hover:text-white/60' : 'border-vigil-blue text-vigil-blue'}`}
            onClick={handleCopy}
          >
            {!copied ? (
              <FontAwesomeIcon icon={faCopy} />
            ) : (
              <FontAwesomeIcon icon={faCheck} />
            )}
          </button>
        </div>
      </div>
      <div className="text-vigil-muted-extra text-[11px] md:text-[13px] tracking-wide">
        {info}
      </div>
    </div>
  );
}
