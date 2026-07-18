'use client';

import { useEffect, useMemo, useState } from 'react';
import { AirportResponse, listAirports } from '../../lib/api-client';

interface AirportPickerProps {
  accessToken: string;
  onSelect?: (airport: AirportResponse) => void;
}

// Reusable browse/typeahead picker (TASKS.md T27) — same pattern as AirlinePicker; reused
// as the Sector origin/destination selector in the Booking Wizard (T34).
export function AirportPicker({ accessToken, onSelect }: AirportPickerProps) {
  const [airports, setAirports] = useState<AirportResponse[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAirports(accessToken)
      .then(setAirports)
      .catch(() => setError('Failed to load airports'));
  }, [accessToken]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return airports;
    }
    return airports.filter(
      (airport) =>
        airport.name.toLowerCase().includes(q) ||
        airport.iataCode.toLowerCase().includes(q) ||
        (airport.icaoCode ?? '').toLowerCase().includes(q),
    );
  }, [airports, query]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search airports by name or code…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-3 w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
      />

      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4 font-medium">IATA</th>
            <th className="py-2 pr-4 font-medium">ICAO</th>
            <th className="py-2 pr-4 font-medium">Name</th>
            {onSelect && <th className="py-2 pr-4 text-right font-medium">Select</th>}
          </tr>
        </thead>
        <tbody>
          {results.map((airport) => (
            <tr key={airport.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-mono text-neutral-900">{airport.iataCode}</td>
              <td className="py-2 pr-4 font-mono text-neutral-700">{airport.icaoCode ?? '—'}</td>
              <td className="py-2 pr-4 text-neutral-700">{airport.name}</td>
              {onSelect && (
                <td className="py-2 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(airport)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Select
                  </button>
                </td>
              )}
            </tr>
          ))}
          {results.length === 0 && (
            <tr>
              <td colSpan={onSelect ? 4 : 3} className="py-6 text-center text-neutral-600">
                No airports match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
