'use client';

import { FormEvent, useState } from 'react';
import { ApiRequestError, SettingsResponse, UpdateSettingsInput } from '../../lib/api-client';

interface SettingsFormProps {
  initialData: SettingsResponse;
  onSave: (data: UpdateSettingsInput) => Promise<SettingsResponse>;
}

export function SettingsForm({ initialData, onSave }: SettingsFormProps) {
  const [form, setForm] = useState<UpdateSettingsInput>({
    legalName: initialData.legalName ?? '',
    logoUrl: initialData.logoUrl ?? '',
    theme: initialData.theme,
    currencyCode: initialData.currencyCode,
    timezone: initialData.timezone,
    invoicePrefix: initialData.invoicePrefix,
    ticketPrefix: initialData.ticketPrefix,
    contactEmail: initialData.contactEmail ?? '',
    contactPhone: initialData.contactPhone ?? '',
    addressLine1: initialData.addressLine1 ?? '',
    addressLine2: initialData.addressLine2 ?? '',
    postalCode: initialData.postalCode ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setField = <K extends keyof UpdateSettingsInput>(key: K, value: UpdateSettingsInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Optional fields (contactEmail, addressLine1, ...) are format-validated by the API
      // when present (e.g. IsEmail) but are not nullable via this DTO — an untouched blank
      // field is omitted rather than sent as '' so it doesn't fail that validation.
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value !== ''),
      ) as UpdateSettingsInput;
      await onSave(payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && !saving && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Settings saved.</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="legalName">
          Legal Name
        </label>
        <input
          id="legalName"
          type="text"
          value={form.legalName ?? ''}
          onChange={(e) => setField('legalName', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="logoUrl">
          Logo URL
        </label>
        <input
          id="logoUrl"
          type="text"
          value={form.logoUrl ?? ''}
          onChange={(e) => setField('logoUrl', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="theme">
            Theme
          </label>
          <select
            id="theme"
            value={form.theme}
            onChange={(e) => setField('theme', e.target.value as UpdateSettingsInput['theme'])}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="currencyCode">
            Currency Code
          </label>
          <input
            id="currencyCode"
            type="text"
            maxLength={3}
            value={form.currencyCode ?? ''}
            onChange={(e) => setField('currencyCode', e.target.value.toUpperCase())}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm uppercase focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="timezone">
          Timezone
        </label>
        <input
          id="timezone"
          type="text"
          value={form.timezone ?? ''}
          onChange={(e) => setField('timezone', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="invoicePrefix">
            Invoice Prefix
          </label>
          <input
            id="invoicePrefix"
            type="text"
            value={form.invoicePrefix ?? ''}
            onChange={(e) => setField('invoicePrefix', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="ticketPrefix">
            Ticket Prefix
          </label>
          <input
            id="ticketPrefix"
            type="text"
            value={form.ticketPrefix ?? ''}
            onChange={(e) => setField('ticketPrefix', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="contactEmail">
            Contact Email
          </label>
          <input
            id="contactEmail"
            type="email"
            value={form.contactEmail ?? ''}
            onChange={(e) => setField('contactEmail', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="contactPhone">
            Contact Phone
          </label>
          <input
            id="contactPhone"
            type="text"
            value={form.contactPhone ?? ''}
            onChange={(e) => setField('contactPhone', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="addressLine1">
          Address Line 1
        </label>
        <input
          id="addressLine1"
          type="text"
          value={form.addressLine1 ?? ''}
          onChange={(e) => setField('addressLine1', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="addressLine2">
          Address Line 2
        </label>
        <input
          id="addressLine2"
          type="text"
          value={form.addressLine2 ?? ''}
          onChange={(e) => setField('addressLine2', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      <div className="max-w-xs">
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="postalCode">
          Postal Code
        </label>
        <input
          id="postalCode"
          type="text"
          value={form.postalCode ?? ''}
          onChange={(e) => setField('postalCode', e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
}
