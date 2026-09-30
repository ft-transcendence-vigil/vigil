import { Link } from 'react-router-dom';

interface Data {
  title: string;
  path: string;
}

export default function SidebarItem({ title, path }: Data) {
  return (
    <Link
      to={path}
      className="sidebar-item group relative max-w-100
      focus:bg-[#2195f32f]
      transition-colors duration-400
      before:transition-all
      before:duration-400
      before:absolute
      before:left-0
      before:top-0
      before:w-0.5
      focus:before:bg-vigil-blue
      focus:before:h-full
      hover:before:h-full
      hover:before:bg-white
      hover:bg-vigil-blue-100"
    >
      <span className="tracking-wide inline-block capitalize py-2 ms-7 text-vigil-muted group-hover:text-white group-focus:text-vigil-blue transition-colors duration-400">
        {title}
      </span>
    </Link>
  );
}
