import { useContext } from 'react';
import LogoutButton from '../components/shared/LogoutButton';
import { AuthContext } from '../auth/authContext';

export default function DashboardPage() {
  const auth = useContext(AuthContext);
  return (
    <>
      <h1 className="text-black text-center uppercase">Dashboard Page</h1>;
      <LogoutButton />
      <button
        onClick={() => {
          auth?.apiFetch('/users/me', {});
        }}
        className="my-5 cursor-pointer uppercase py-3 px-5 text-vigil-blue border hover:opacity-70 block w-fit mx-auto"
      >
        Fetch
      </button>
    </>
  );
}
