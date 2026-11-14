import { useState } from 'react';
import type { Severity } from '../../api/alertRulesApi';
import LogsDetails from './LogsDetails';
import { borderColor, severityColors } from './colorsGuid';

export type LogsSeverity = Severity | 'error';

export type Attributes = Record<string, string>;

interface Data {
  time: string;
  service: string;
  severity: LogsSeverity;
  message: string;
  attributes: Attributes;
  isLive?: boolean;
}

export default function LogsRow({
  time,
  service,
  severity,
  message,
  attributes,
  isLive,
}: Data) {
  const [isOpen, setIsOpen] = useState(false);
  const levelColor = severityColors[severity];

  return (
    <>
      <tr
        className={`border-b border-vigil-border hover:bg-vigil-row-hover transition-colors duration-200 cursor-pointer relative after:absolute after:right-5 after:top-1/2 after:-translate-y-1/2 ${isOpen ? "after:content-['▴']" : "after:content-['▾']"} text-[12px] text-vigil-muted ${isLive ? 'animate-log-flash' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <td
          className={`text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 border-l ${borderColor[severity]}`}
        >
          {time}
        </td>
        <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
          {service}
        </td>
        <td className="text-[13px] py-1 md:py-3 px-2 md:px-3">
          <span className={`px-2 py-1 mono ${levelColor}`}>{severity}</span>
        </td>
        <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3">
          {message}
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={4}>
            <LogsDetails attributes={attributes} message={message} />
          </td>
        </tr>
      )}
    </>
  );
}
