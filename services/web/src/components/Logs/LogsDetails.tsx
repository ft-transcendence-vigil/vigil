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
        <div className="flex space-x-25">
          <p className="lowercase text-vigil-muted-extra text-[13px]">
            request_id:{' '}
            <span className="text-white ms-1 text-[14px]">
              {attributes.request_id}
            </span>
          </p>
          <p className="lowercase text-vigil-muted-extra text-[13px]">
            endpoint:{' '}
            <span className="text-white ms-1 text-[14px]">
              {attributes.endpoint}
            </span>
          </p>
          <p className="lowercase text-vigil-muted-extra text-[13px]">
            status_code:{' '}
            <span className="text-white ms-1 text-[14px]">
              {attributes.status_code}
            </span>
          </p>
          <p className="lowercase text-vigil-muted-extra text-[13px]">
            region:{' '}
            <span className="text-white ms-1 text-[14px]">
              {attributes.region}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
