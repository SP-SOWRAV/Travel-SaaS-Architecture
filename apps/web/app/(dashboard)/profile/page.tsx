'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiRequestError,
  UserResponse,
  changeMyPassword,
  getMe,
  updateMe,
} from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';

export default function ProfilePage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<UserResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    getMe(accessToken)
      .then((user) => {
        setMe(user);
        setFullName(user.fullName);
        setPhone(user.phone ?? '');
      })
      .catch(() => setLoadError('Failed to load profile'));
  }, [accessToken]);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setProfileError(null);
    setProfileSaving(true);
    try {
      const payload: { fullName?: string; phone?: string } = { fullName };
      if (phone) {
        payload.phone = phone;
      }
      const updated = await updateMe(accessToken, payload);
      setMe(updated);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to save');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setPasswordError(null);
    setPasswordSaved(false);
    setPasswordSaving(true);
    try {
      await changeMyPassword(accessToken, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(
        err instanceof ApiRequestError ? err.apiError.message : 'Failed to change password',
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-8">
        <h1 className="text-2xl font-semibold text-neutral-900">My Profile</h1>

        {loadError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        {me && (
          <form
            onSubmit={handleProfileSubmit}
            className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6"
          >
            <h2 className="text-lg font-semibold text-neutral-900">Details</h2>

            {profileError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {profileError}
              </p>
            )}
            {profileSaved && !profileSaving && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Profile saved.
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={me.email}
                disabled
                className="w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setProfileSaved(false);
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setProfileSaved(false);
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        )}

        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6"
        >
          <h2 className="text-lg font-semibold text-neutral-900">Change Password</h2>

          {passwordError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {passwordError}
            </p>
          )}
          {passwordSaved && !passwordSaving && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Password changed.
            </p>
          )}

          <div>
            <label
              className="mb-1 block text-sm font-medium text-neutral-700"
              htmlFor="currentPassword"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {passwordSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
