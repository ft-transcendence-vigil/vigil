import { toast } from 'sonner';
import { useAuth } from '../../auth/authContext';

export default function LogoutButton() {
  const auth = useAuth();

  if (!auth) throw new Error('AuthContext must be used inside AuthProvider');

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch {
      toast.warning(
        'We couldn’t fully sign you out. Your session may still be active.',
      );
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        className="cursor-pointer tracking-wide font-medium uppercase text-[10px] md:text-[11px] lg:text-[12.5px] py-1.75 px-4.5 text-vigil-logout border hover:opacity-70 transition-opacity duration-300"
      >
        Logout
      </button>
    </>
  );
}
