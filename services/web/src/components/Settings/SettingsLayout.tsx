import { NavLink, Outlet } from 'react-router-dom';
import { settingsNavigation } from './settingsNavigation';
import { useAuth } from '../../auth/authContext';
import { filterNavigation } from '../../auth/permissions';

export default function SettingsLayout() {
  const {user} = useAuth();
  const navigation = filterNavigation(settingsNavigation, user?.role === 'admin');
  return (
    <div className="flex flex-col">
      <aside className="flex text-center mb-7">
        {navigation.map((nav) => (
          <NavLink
            key={nav.path}
            to={nav.path}
            className={({ isActive }) =>
              `relative
                block
                tracking-wide
                capitalize
                py-2.5
                w-45
                text-[13px]
                md:text-[16px]
                transition-colors
                duration-400
                before:absolute
                before:left-0
                before:bottom-0
                before:w-full
                before:h-0.5
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
            {nav.label}
          </NavLink>
        ))}
      </aside>
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
