export const dashboardNavigation = [
  {
    title: 'monitor',
    links: [
      { label: 'overview', path: '/overview' },
      { label: 'alerts', path: '/alerts' },
    ],
  },
  {
    title: 'telemetry',
    links: [
      { label: 'logs', path: '/logs' },
      { label: 'metrics', path: '/metrics' },
      { label: 'traces', path: '/traces' },
    ],
  },
  {
    title: 'configure',
    links: [
      { label: 'add service', path: '/add-service', adminOnly: true },
      { label: 'alert rules', path: '/alert-rules', adminOnly: true },
      { label: 'settings', path: '/settings' },
    ],
  },
];

export const getPageTitle = (pathname: string) => {
  for (const section of dashboardNavigation) {
    const link = section.links.find((link) => link.path === pathname);
    if (link) return link.label;
  }
  if (pathname.startsWith('/settings/')) return 'settings';
  return 'page not found';
};
