import type { ServiceHealth } from '../../hooks/useStatus';

interface Data {
  services: ServiceHealth[];
}

export default function StatusBanner({ services }: Data) {
  const down = services.filter((s) => s.health === 'down');
  const degraded = services.filter((s) => s.health === 'degraded');
  const healthy = services.length - down.length - degraded.length;
  const affected = [...down, ...degraded].map((s) => s.name);

  const title = down.length
    ? `Outage affecting ${down.length} service${down.length > 1 ? 's' : ''}`
    : degraded.length
      ? `${degraded.length} service${degraded.length > 1 ? 's are' : ' is'} degraded`
      : services.length
        ? 'All systems operational'
        : 'No services reporting';

  const accent = down.length
    ? 'border-l-[#ff4757]'
    : degraded.length
      ? 'border-l-[#f59e0b]'
      : services.length
        ? 'border-l-[#00d68f]'
        : 'border-l-vigil-muted';

  return (
    <div
      className={`kpi-card flex flex-wrap items-center gap-5 border border-vigil-border border-l-3 ${accent} px-5 sm:px-6 py-5`}
    >
      <div className="min-w-0">
        <h2 className="text-[18px] sm:text-[22px] font-semibold tracking-wide mb-1">
          {title}
        </h2>
        <p className="text-[13px] text-vigil-muted">
          {affected.length
            ? `${affected.join(', ')} need${affected.length === 1 ? 's' : ''} attention.`
            : services.length
              ? 'Every service is reporting normal latency and error rates.'
              : 'No spans were received in the last hour.'}
        </p>
      </div>
      {services.length > 0 && (
        <div className="ms-auto text-right">
          <div className="space text-[34px]">
            {healthy}
            <span className="text-[20px] text-vigil-muted">
              /{services.length}
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-vigil-muted mt-1">
            services healthy
          </div>
        </div>
      )}
    </div>
  );
}
