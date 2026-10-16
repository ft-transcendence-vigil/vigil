import CardLayout from '../../components/Settings/CardLayout';
import { useState } from 'react';
import UserRow from '../../components/Settings/UserRow';
import UserModal from '../../components/Settings/UserModal';
import type { User } from '../../api/usersApi';
import { deleteUser, getAllUsers } from '../../api/usersApi';
import { useAuth } from '../../auth/authContext';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ModalState =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      user: User;
    };

export default function UsersSettings() {
  const { apiFetch, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => getAllUsers(apiFetch),
    staleTime: 5 * 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(apiFetch, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['users'],
      });
      toast.success('User deleted successfully');
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete user',
      );
    },
  });

  const users = usersQuery.data ?? [];

  const sortedUsers = [...users].sort(
    (a, b) =>
      Number(b.id === currentUser?.id) - Number(a.id === currentUser?.id),
  );

  return (
    <div className="users-settings flex flex-col space-y-5">
      <CardLayout
        title="Users"
        btnValue="+ Add user"
        onClick={() => setModal({ mode: 'create' })}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px]">
              <th className="py-2 md:py-4 px-2 md:px-3">Email</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Role</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <UserRow
                key={user.id}
                email={user.email}
                role={user.role}
                isCurrent={user.email === currentUser?.email}
                onEdit={() =>
                  setModal({
                    mode: 'edit',
                    user,
                  })
                }
                onDelete={() => deleteMutation.mutate(user.id)}
              />
            ))}
          </tbody>
        </table>
      </CardLayout>
      {modal?.mode === 'create' && (
        <UserModal
          key="create"
          mode="create"
          onClose={() => setModal(null)}
          onCreated={() => setModal(null)}
        />
      )}

      {modal?.mode === 'edit' && (
        <UserModal
          key={`edit-${modal.user.id}`}
          mode="edit"
          user={modal.user}
          onClose={() => setModal(null)}
          onUpdated={() => setModal(null)}
        />
      )}
    </div>
  );
}
