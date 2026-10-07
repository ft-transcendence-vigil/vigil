export const hasRefreshHint = (): boolean => {
  return document.cookie
    .split(';')
    .some((cookie: string) => cookie.trim() === 'refresh_hint=true');
};
