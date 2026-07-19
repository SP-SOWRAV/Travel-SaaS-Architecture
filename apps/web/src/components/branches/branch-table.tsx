'use client';

import { BranchResponse } from '../../lib/api-client';
import { TableSkeleton } from '../ui/skeleton';

interface BranchTableProps {
  branches: BranchResponse[];
  onEdit: (branch: BranchResponse) => void;
  onDelete: (branch: BranchResponse) => void;
  loading?: boolean;
}

export function BranchTable({ branches, onEdit, onDelete, loading }: BranchTableProps) {
  if (!loading && branches.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-600">No branches yet.</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500">
          <th className="py-2 pr-4 font-medium">Name</th>
          <th className="py-2 pr-4 font-medium">Code</th>
          <th className="py-2 pr-4 font-medium">Phone</th>
          <th className="py-2 pr-4 font-medium">Email</th>
          <th className="py-2 pr-4 text-center font-medium">Status</th>
          <th className="py-2 pr-4 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading && <TableSkeleton rows={5} columns={6} />}
        {!loading && branches.map((branch) => (
          <tr key={branch.id} className="border-b border-neutral-100">
            <td className="py-2 pr-4 text-neutral-900">{branch.name}</td>
            <td className="py-2 pr-4 font-mono text-neutral-700">{branch.code}</td>
            <td className="py-2 pr-4 text-neutral-700">{branch.phone ?? '—'}</td>
            <td className="py-2 pr-4 text-neutral-700">{branch.email ?? '—'}</td>
            <td className="py-2 pr-4 text-center">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  branch.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {branch.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="py-2 pr-4 text-right">
              <button
                type="button"
                aria-label={`Edit ${branch.name}`}
                onClick={() => onEdit(branch)}
                className="mr-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Edit
              </button>
              <button
                type="button"
                aria-label={`Delete ${branch.name}`}
                onClick={() => onDelete(branch)}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
