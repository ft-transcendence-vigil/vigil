import formatLastActive from './date';

export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

export function timeAgo(iso: string): string {
  const date = new Date(iso);
  return formatLastActive(Date.now() - date.getTime(), date);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
