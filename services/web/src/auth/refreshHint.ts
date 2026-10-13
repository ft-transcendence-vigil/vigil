export const hasRefreshHint = (): boolean => {
  return document.cookie
    .split(';')
    .some((cookie: string) => cookie.trim() === 'session_hint=1');
};
