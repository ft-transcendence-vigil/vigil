import KpiCard from './KpiCard';

export default function KpiSection() {
  return (
    <div className="grid grid-cols-12 gap-5">
      <KpiCard state="critical" value={3} />
      <KpiCard state="warning" value={13} />
      <KpiCard state="unack" value={5} />
      <KpiCard state="healthy" value="8/14" />
    </div>
  );
}
