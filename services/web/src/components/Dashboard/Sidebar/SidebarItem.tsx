import { NavLink } from 'react-router-dom';

interface Data {
  title: string;
  path: string;
}

export default function SidebarItem({ title, path }: Data) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `relative
        block
        max-w-100
        tracking-wide
        capitalize
        py-2.5 ps-7
        text-[14px]
        md:text-[16px]
        transition-colors
        duration-400
        before:absolute
        before:left-0
        before:top-0
        before:w-0.5
        before:h-full
        before:opacity-0
        before:transition-opacity
        before:duration-400
        ${
          isActive
            ? 'bg-[#2195f317] text-vigil-blue before:opacity-100 before:bg-vigil-blue'
            : 'text-vigil-muted hover:text-white hover:bg-vigil-blue-100 hover:before:opacity-100 hover:before:bg-white'
        }`
      }
    >
      {title}
      {title === 'alerts' && (
        <span className="absolute top-1/2 -translate-y-1/2 p-0.5 flex justify-center items-center right-5 w-4.5 h-4.5 md:w-5 md:h-5 text-[11px] md:text-[12px] text-[#ff4757] bg-[rgba(255,71,87,.12)] border border-[rgba(255,71,86,0.34)]">
          5
        </span>
      )}
    </NavLink>
  );
}
