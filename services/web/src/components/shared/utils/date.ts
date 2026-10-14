export default function formatLastActive(diff: number, date: Date): string {
  const totalMinutes = Math.floor(diff / 60_000);
  const totalHours = Math.floor(diff / 3_600_000);
  const totalDays = Math.floor(diff / 86_400_000);

  if (totalMinutes < 1) {
    return 'Just now';
  }
  if (totalMinutes < 60) {
    return `${totalMinutes}m ago`;
  }
  if (totalHours < 24) {
    return `${totalHours}h ago`;
  }
  if (totalDays < 7) {
    return `${totalDays}d ago`;
  }
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
