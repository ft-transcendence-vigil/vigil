import ServicesPreviewCard from './ServicesPreviewCard';
import MOCK_DATA from './ServicesPreviewData';

export default function ServicesPreview() {
  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card overflow-y-scroll">
      <div className="flex justify-between border-b border-vigil-border px-3 sm:px-5 py-3 sticky bg-vigil-card z-40 top-0">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">Services</h2>
      </div>
      <div className="grid grid-cols-12 gap-4 min-h-0 flex-1 mono p-3 sm:p-4">
        {MOCK_DATA.slice(0, 5).map((d) => (
          <ServicesPreviewCard
            key={d.title}
            severity={d.severity}
            title={d.title}
            latency={d.latency}
            throughput={d.throughput}
            className={d.className}
          />
        ))}
        {MOCK_DATA.length > 5 && (
          <div className="flex flex-col justify-center items-center border border-dotted p-2 border-vigil-border col-span-12 sm:col-span-6 xl:col-span-4 bg-[#0D1425] cursor-pointer hover:border-[#2195f369] transition-[border-color] duration-300 focus:border-vigil-blue">
            <div className="text-2xl">+{MOCK_DATA.length - 5}</div>
            <button className="text-[12px] text-vigil-muted">view all</button>
          </div>
        )}
      </div>
    </div>
  );
}
