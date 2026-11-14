import formatLastActive from './date';
//turns ms into s make it readable
export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}
//when traces happened we do this for mat "Just now", "5m ago", "3h ago", "2d ago"
export function timeAgo(iso: string): string {
  const date = new Date(iso);
  return formatLastActive(Date.now() - date.getTime(), date);
}
//full date/ format medium
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  });
}
// all these are properties of the brpwser
export function downloadBlob(blob: Blob, filename: string): void {
  //create a tem url that points to blob in memory something like https://localhost/3f2a9c1e
  const url = URL.createObjectURL(blob);
  //create a link
  const link = document.createElement('a');
  //point the link to the blob
  link.href = url;
  link.download = filename;
  //add the link to the page
  document.body.appendChild(link);
  //the download happen here when clicking on the link
  link.click();
  //remove link not needed anymore 
  link.remove();
  //free the temp url from memory
  URL.revokeObjectURL(url);
}
