import AlertsPreview from '../../components/Overview/AlertsPreview/AlertsPreview';
import KpiSection from '../../components/Overview/KpiCard/KpiSection';
import LogsPreview from '../../components/Overview/LogsPreview/LogsPreview';
import RequestPerformance, {
  type Point,
} from '../../components/Overview/RequestPerformance/RequestPerformance';
import ServicesPreview from '../../components/Overview/ServicesPreview/ServicesPreview';

const N = 12;
const STEP = 5 * 60 * 1000;
const end = Date.now();

const mockData: Point[] = Array.from({ length: N }, (_, i) => ({
  ts: end - (N - 1 - i) * STEP,
  throughput: Math.round(
    230 + 110 * Math.sin(i / 1.6) + (Math.random() * 80 - 40),
  ),
  latency: Math.round(
    120 + 45 * Math.sin(i / 1.3 + 1.5) + (Math.random() * 30 - 15),
  ),
  errors: Math.round(
    Math.max(0, 6 + 8 * Math.sin(i / 2) + (Math.random() * 6 - 3)),
  ),
}));

export default function OverviewPage() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:h-full xl:min-h-0 xl:grid-cols-12 xl:grid-rows-[auto_minmax(0,13fr)_minmax(0,7fr)]">
      <div className="col-span-12">
        <KpiSection />
      </div>
      <div className="h-90 col-span-12 xl:col-span-7 xl:h-auto xl:min-h-0">
        <RequestPerformance data={mockData} />
      </div>
      <div className="flex flex-col gap-5 col-span-12 xl:col-span-5 xl:row-span-2 xl:min-h-0">
        <div className="flex h-80 flex-col xl:h-auto xl:min-h-0 xl:flex-1 xl:basis-0">
          <AlertsPreview />
        </div>
        <div className="flex h-80 flex-col col-span-12 xl:h-auto xl:min-h-0 xl:flex-1 xl:basis-0">
          <LogsPreview />
        </div>
      </div>
      <div className="min-h-64 col-span-12 xl:col-span-7 xl:h-auto xl:min-h-0">
        <ServicesPreview />
      </div>
    </div>
  );
}
