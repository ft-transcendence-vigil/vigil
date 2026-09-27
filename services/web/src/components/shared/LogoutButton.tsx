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
      onClick={handleLogout}
      className="cursor-pointer uppercase py-3 px-5 text-black border hover:opacity-70 block w-fit mx-auto"
    >
      Log out
    </button>
  );
}
