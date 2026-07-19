'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BranchResponse,
  CreateUserInput,
  UpdateUserInput,
  UserResponse,
  createUser,
  listBranches,
  listUsers,
  updateUser,
} from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { UserFormModal } from '../../../src/components/users/user-form-modal';
import { UserTable } from '../../../src/components/users/user-table';

export default function UsersPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    Promise.all([listUsers(accessToken), listBranches(accessToken)])
      .then(([userList, branchList]) => {
        setUsers(userList);
        setBranches(branchList);
      })
      .catch(() => setLoadError('Failed to load staff users'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: UserResponse) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSave = useCallback(
    async (data: CreateUserInput | UpdateUserInput) => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }
      if (editingUser) {
        const updated = await updateUser(accessToken, editingUser.id, data as UpdateUserInput);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await createUser(accessToken, data as CreateUserInput);
        setUsers((prev) => [created, ...prev]);
      }
    },
    [accessToken, editingUser],
  );

  const handleToggleActive = useCallback(
    async (user: UserResponse) => {
      if (!accessToken) {
        return;
      }
      const updated = await updateUser(accessToken, user.id, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    },
    [accessToken],
  );

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Staff Users</h1>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Staff User
          </button>
        </div>

        {loadError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <UserTable
            users={users}
            branches={branches}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
            loading={loading}
          />
        </div>
      </div>

      {showForm && (
        <UserFormModal
          user={editingUser}
          branches={branches}
          onClose={() => setShowForm(false)}
          onSubmit={handleSave}
        />
      )}
    </main>
  );
}
