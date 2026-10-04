import AlertsPreview from '../../components/Overview/AlertsPreview/AlertsPreview';
import KpiSection from '../../components/Overview/KpiCard/KpiSection';
import LogsPreview from '../../components/Overview/LogsPreview';
import RequestPerformance, {
  type Point,
} from '../../components/Overview/RequestPerformance/RequestPerformance';
import ServicesOverview from '../../components/Overview/ServicesOverview';

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
    <div className="grid h-full min-h-160 grid-cols-12 grid-rows-[auto_13fr_7fr] gap-5">
      <div className="col-span-12">
        <KpiSection />
      </div>
      <div className="col-span-8 min-h-0">
        <RequestPerformance data={mockData} />
      </div>
      <div className="col-span-4 row-span-2 flex min-h-0 flex-col gap-5">
        <div className="flex min-h-0 max-h-[60%] shrink-0 flex-col">
          <AlertsPreview />
        </div>
        <div className="min-h-0 flex-1">
          <LogsPreview />
        </div>
      </div>
      <div className="col-span-8 min-h-0">
        <ServicesOverview />
      </div>
    </div>
  );
}
