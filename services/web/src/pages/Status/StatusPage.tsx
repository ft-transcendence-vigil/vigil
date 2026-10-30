import useStatus from '../../hooks/useStatus';
import StatusBanner from '../../components/Status/StatusBanner';
import ServiceHealthCard from '../../components/Status/ServiceHealthCard';
import InfraMetricCard from '../../components/Status/InfraMetricCard';
import RecentAlerts from '../../components/Status/RecentAlerts';
import SectionHeader from '../../components/shared/SectionHeader';
import StateMessage from '../../components/shared/StateMessage';

export default function StatusPage() {
  const {
    services,
    servicesLoading,
    servicesError,
    infra,
    infraLoading,
    infraError,
    alerts,
    alertsLoading,
    alertsError,
    updatedAt,
    isRefreshing,
    refresh,
  } = useStatus();

  return (
    <div className="space-y-7 xl:h-full xl:overflow-y-auto xl:pe-2">
      <div className="flex items-center justify-end gap-3 text-[12px] text-vigil-muted">
        <span>
          {updatedAt
            ? `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour12: false })}`
            : 'Loading…'}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border px-4 h-9 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-200"
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {servicesError ? (
        <StateMessage text={servicesError.message} isError />
      ) : (
        !servicesLoading && <StatusBanner services={services} />
      )}

      <section>
        <SectionHeader
          title="Services"
          caption="From the latest 500 spans in the last hour"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {servicesLoading &&
            Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-36 bg-[#0D1425] border border-vigil-border animate-pulse"
              />
            ))}
          {!servicesLoading &&
            !servicesError &&
            services.map((service) => (
              <ServiceHealthCard key={service.name} service={service} />
            ))}
          {!servicesLoading && !servicesError && services.length === 0 && (
            <StateMessage text="No service sent spans in the last hour." />
          )}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Infrastructure"
          caption="Latest internal metrics (vigil.internal)"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {infraLoading && <StateMessage text="Loading…" />}
          {infraError && <StateMessage text={infraError.message} isError />}
          {!infraLoading && !infraError && infra.length === 0 && (
            <StateMessage text="No internal metrics reported in the last hour." />
          )}
          {infra.map((metric) => (
            <InfraMetricCard
              key={`${metric.service}/${metric.name}`}
              metric={metric}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Recent alerts" caption="Last 24 hours" />
        <RecentAlerts
          alerts={alerts}
          isLoading={alertsLoading}
          error={alertsError}
        />
      </section>
    </div>
  );
}
