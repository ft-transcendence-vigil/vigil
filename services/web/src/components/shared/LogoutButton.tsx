import { useAuth } from '../../auth/authContext';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const auth = useAuth();
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
    <>
      <button
        type="button"
        onClick={handleLogout}
        className="cursor-pointer tracking-wide font-medium uppercase text-[10px] md:text-[11px] lg:text-[12.5px] py-1.75 px-4.5 text-[#fb2c36e2] border hover:opacity-70 transition-opacity duration-300"
      >
        Logout
      </button>
    </>
  );
}
