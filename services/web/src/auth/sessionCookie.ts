export const setSessionCookie = (): void => {
  document.cookie = 'has_session=1; Path=/; SameSite=Strict';
};

export const hasSessionCookie = (): boolean => {
  return document.cookie
    .split(';')
    .some((cookie: string) => cookie.trim() === 'has_session=1');
};

export const clearSessionCookie = (): void => {
  document.cookie = 'has_session=; Path=/; Max-Age=0; SameSite=Strict';
};
