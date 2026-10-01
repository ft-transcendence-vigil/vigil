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
          transition-colors duration-400
          ${
            isActive
              ? 'text-vigil-blue'
              : 'text-vigil-muted group-hover:text-white'
          }
        `}
        >
          {title}
        </span>
      )}
    </NavLink>
  );
}
