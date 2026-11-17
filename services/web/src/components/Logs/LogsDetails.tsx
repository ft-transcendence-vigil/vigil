import type { Attributes } from './LogsRow';

interface Data {
  attributes: Attributes;
  message: string;
}

export default function LogsDetails({ attributes, message }: Data) {
  return (
    <div className="bg-vigil-bg px-3 py-4.5 space-y-4 mono">
      <div>
        <div className="title uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
          Message
        </div>
        <div className="text-[14px]">{message}</div>
      </div>
      <div>
        <div className="attribute uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
          Attributes
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(attributes).map(([key, value]) => (
            <p
              key={key}
              className="min-w-0 wrap-break-word text-vigil-muted-extra text-[13px]"
            >
              {key}:{' '}
              <span className="text-vigil-text ms-1 text-[14px]">{value}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
