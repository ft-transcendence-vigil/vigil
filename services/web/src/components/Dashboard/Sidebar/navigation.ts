export const navigation = [
  {
    title: 'monitor',
    links: [
      { label: 'overview', path: '/overview' },
      { label: 'alerts', path: '/alerts' },
      { label: 'status', path: '/status' },
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
    title: 'intelligence',
    links: [{ label: 'AI insights', path: '/ai-insights' }],
  },
  {
    title: 'configure',
    links: [
      { label: 'services', path: '/services' },
      { label: 'alert rules', path: '/alert-rules' },
      { label: 'settings', path: '/settings' },
    ],
  },
];

export const getPageTitle = (pathname: string) => {
  for (const section of navigation) {
    const link = section.links.find((link) => link.path === pathname);
    if (link) return link.label;
  }
  return 'Vigil';
};
