import AlertsPreview from '../../components/Overview/AlertsPreview';
import KpiSection from '../../components/Overview/KpiCard/KpiSection';
import LogsPreview from '../../components/Overview/LogsPreview';
import RequestLifecycleCard from '../../components/Overview/RequestLifecycleCard';
import ServicesOverview from '../../components/Overview/ServicesOverview';

export default function OverviewPage() {
  return (
    /*
      grid grid-cols-12 {
        card-sections {
          card col-span-3 {
          }
        }
      }
    */
    <div className="grid grid-cols-12">
      <div className="col-span-12">
      <KpiSection />
      </div>
      <RequestLifecycleCard />
      <ServicesOverview />
      <AlertsPreview />
      <LogsPreview />
    </div>
  );
}
