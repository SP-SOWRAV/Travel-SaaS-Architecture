'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSettings,
  SettingsResponse,
  updateSettings,
  UpdateSettingsInput,
} from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { SettingsForm } from '../../../src/components/settings/settings-form';

export default function SettingsPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    getSettings(accessToken)
      .then(setSettings)
      .catch(() => setLoadError('Failed to load settings'));
  }, [accessToken]);

  const handleSave = useCallback(
    async (data: UpdateSettingsInput) => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }
      const updated = await updateSettings(accessToken, data);
      setSettings(updated);
      return updated;
    },
    [accessToken],
  );

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Agency Settings</h1>

        {loadError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        {!settings && !loadError && <p className="text-sm text-neutral-600">Loading…</p>}

        {settings && <SettingsForm initialData={settings} onSave={handleSave} />}
      </div>
    </main>
  );
}
