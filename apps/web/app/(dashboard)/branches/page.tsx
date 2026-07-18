'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BranchResponse,
  CreateBranchInput,
  UpdateBranchInput,
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
} from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { BranchFormModal } from '../../../src/components/branches/branch-form-modal';
import { BranchTable } from '../../../src/components/branches/branch-table';
import { DeleteBranchModal } from '../../../src/components/branches/delete-branch-modal';

export default function BranchesPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingBranch, setEditingBranch] = useState<BranchResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<BranchResponse | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    listBranches(accessToken)
      .then(setBranches)
      .catch(() => setLoadError('Failed to load branches'));
  }, [accessToken]);

  const handleCreate = () => {
    setEditingBranch(null);
    setShowForm(true);
  };

  const handleEdit = (branch: BranchResponse) => {
    setEditingBranch(branch);
    setShowForm(true);
  };

  const handleSave = useCallback(
    async (data: CreateBranchInput | UpdateBranchInput) => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }
      if (editingBranch) {
        const updated = await updateBranch(accessToken, editingBranch.id, data);
        setBranches((prev) => prev.map((branch) => (branch.id === updated.id ? updated : branch)));
      } else {
        const created = await createBranch(accessToken, data as CreateBranchInput);
        setBranches((prev) => [created, ...prev]);
      }
    },
    [accessToken, editingBranch],
  );

  const handleDelete = useCallback(async () => {
    if (!accessToken || !deletingBranch) {
      return;
    }
    await deleteBranch(accessToken, deletingBranch.id);
    setBranches((prev) => prev.filter((branch) => branch.id !== deletingBranch.id));
    setDeletingBranch(null);
  }, [accessToken, deletingBranch]);

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Branches</h1>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Branch
          </button>
        </div>

        {loadError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <BranchTable branches={branches} onEdit={handleEdit} onDelete={setDeletingBranch} />
        </div>
      </div>

      {showForm && (
        <BranchFormModal branch={editingBranch} onClose={() => setShowForm(false)} onSubmit={handleSave} />
      )}

      {deletingBranch && (
        <DeleteBranchModal
          branchName={deletingBranch.name}
          onCancel={() => setDeletingBranch(null)}
          onConfirm={handleDelete}
        />
      )}
    </main>
  );
}
