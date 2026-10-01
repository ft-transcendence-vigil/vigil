import SidebarItem from './SidebarItem';

interface Link {
  label: string;
  path: string;
}

interface Data {
  title: string;
  links: Link[];
}
export default function SidebarSection({ title, links }: Data) {
  return (
    <div className="sidebar-section flex flex-col my-2">
      <p className="sidebar-section-title text-[12px] uppercase text-vigil-muted-extra ms-5 mb-1 tracking-wider">
        {title}
      </p>
      {links.map((link) => (
        <SidebarItem key={link.path} title={link.label} path={link.path} />
      ))}
    </div>
  );
}
