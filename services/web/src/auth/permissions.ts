import type { Role } from './authTypes';

export const isAdmin = (role: Role): boolean => {
  return role === 'admin';
};

export const filterNavigation = <T extends { adminOnly?: boolean }>(
  navs: T[],
  isAdminUser: boolean,
): T[] => {
  return navs.filter((nav) => !nav.adminOnly || isAdminUser);
};
