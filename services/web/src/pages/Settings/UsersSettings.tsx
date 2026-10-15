import CardLayout from '../../components/Settings/CardLayout';
import { useEffect, useState } from 'react';
import UserRow from '../../components/Settings/UserRow';
import UserModal from '../../components/Settings/UserModal';
import type { User } from '../../api/usersApi';
import { deleteUser, getAllUsers } from '../../api/usersApi';
import { useAuth } from '../../auth/authContext';
import { toast } from 'sonner';

export default function UsersSettings() {
  const { apiFetch } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<{
    mode: 'create' | 'edit';
    user?: User;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers(apiFetch);
        if (!cancelled) {
          setUsers(data);
        }
      } catch (error) {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : 'Unable to fetch users.',
        );
      }
    };
    void fetchUsers();

    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const handleCreated = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
    setModal(null);
  };

  const handleUpdated = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    );
    setModal(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(apiFetch, id);
      setUsers((prev) => prev.filter((user) => user.id !== id));
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete user.',
      );
    }
  };

  return (
    <div className="users-settings flex flex-col space-y-5">
      <CardLayout
        title="Users"
        btnValue="+ Add user"
        onClick={() => setModal({ mode: 'create' })}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[15px]">
              <th className="py-2 md:py-4 px-2 md:px-3">Email</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Role</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                email={user.email}
                role={user.role}
                onEdit={() =>
                  setModal({
                    mode: 'edit',
                    user,
                  })
                }
                onDelete={() => handleDelete(user.id)}
              />
            ))}
          </tbody>
        </table>
      </CardLayout>
      <UserModal
        key={`${modal?.mode}-${modal?.user?.id ?? 'new'}`}
        isOpen={modal !== null}
        mode={modal?.mode ?? 'create'}
        user={modal?.user}
        onClose={() => setModal(null)}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
