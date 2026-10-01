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
        `sidebar-item relative max-w-100
        transition-colors duration-400
        before:absolute
        before:left-0
        before:top-0
        before:w-0.5
        before:transition-all
        before:duration-400
        hover:bg-vigil-blue-100
        hover:before:h-full
        hover:before:bg-white
        ${isActive ? 'bg-[#2195f32f] before:h-full before:bg-vigil-blue' : ''}`
      }
    >
      {({ isActive }) => (
        <span
          className={`
          tracking-wide inline-block capitalize py-2 ms-7
          transition-colors duration-400 text-[14px] md:text-[16px]
          ${
            isActive
              ? 'text-vigil-blue'
              : 'text-vigil-muted group-hover:text-white'
          }
        `}
        >
          {title}
          {title === 'alerts' && (
            <span className="absolute top-1/2 -translate-y-1/2 p-0.5 flex justify-center items-center right-5 w-4.5 h-4.5 md:w-5 md:h-5 text-[11px] md:text-[12px] text-[#ff4757] bg-[rgba(255,71,87,.12)] border border-[rgba(255,71,86,0.34)]">
              5
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}
