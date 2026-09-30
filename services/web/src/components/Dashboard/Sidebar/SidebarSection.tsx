import SidebarItem from './SidebarItem';

interface Data {
  title: string;
  links: Array<string>;
}
export default function SidebarSection({ title, links }: Data) {
  return (
    <div className="sidebar-section flex flex-col my-2">
      <h6 className="sidebar-section-title text-[12px] uppercase text-vigil-muted-extra ms-5 mb-1 tracking-wider">
        {title}
      </h6>
      {links.map((link) => (
        <SidebarItem title={link} path={''} />
      ))}
    </div>
  );
}
