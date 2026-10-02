import { useContext } from 'react';
import { AuthContext } from '../../auth/authContext';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  if (!auth) throw new Error('AuthContext must be used inside AuthProvider');

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } finally {
      navigate('/auth/login');
    }
  };
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="cursor-pointer tracking-wide font-medium uppercase text-[10px] md:text-[11px] lg:text-[12px] py-1 px-2 text-red-500 border hover:opacity-70 transition-opacity duration-300"
    >
      Logout
    </button>
  );
}
