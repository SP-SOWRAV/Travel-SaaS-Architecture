'use client';

import { BranchResponse, UserResponse } from '../../lib/api-client';
import { TableSkeleton } from '../ui/skeleton';

interface UserTableProps {
  users: UserResponse[];
  branches: BranchResponse[];
  onEdit: (user: UserResponse) => void;
  onToggleActive: (user: UserResponse) => void;
  loading?: boolean;
}

export function UserTable({ users, branches, onEdit, onToggleActive, loading }: UserTableProps) {
  if (!loading && users.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-600">No staff users yet.</p>;
  }

  const branchName = (branchId: string | null) =>
    branches.find((branch) => branch.id === branchId)?.name ?? '—';

  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500">
          <th className="py-2 pr-4 font-medium">Name</th>
          <th className="py-2 pr-4 font-medium">Email</th>
          <th className="py-2 pr-4 font-medium">Role</th>
          <th className="py-2 pr-4 font-medium">Branch</th>
          <th className="py-2 pr-4 text-center font-medium">Status</th>
          <th className="py-2 pr-4 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading && <TableSkeleton rows={5} columns={6} />}
        {!loading && users.map((user) => (
          <tr key={user.id} className="border-b border-neutral-100">
            <td className="py-2 pr-4 text-neutral-900">{user.fullName}</td>
            <td className="py-2 pr-4 text-neutral-700">{user.email}</td>
            <td className="py-2 pr-4 text-neutral-700">{user.role}</td>
            <td className="py-2 pr-4 text-neutral-700">{branchName(user.branchId)}</td>
            <td className="py-2 pr-4 text-center">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  user.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="py-2 pr-4 text-right">
              <button
                type="button"
                aria-label={`Edit ${user.fullName}`}
                onClick={() => onEdit(user)}
                className="mr-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Edit
              </button>
              <button
                type="button"
                aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.fullName}`}
                onClick={() => onToggleActive(user)}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-800"
              >
                {user.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
