'use client';

import { useEffect, useMemo, useState } from 'react';
import { AirlineResponse, listAirlines } from '../../lib/api-client';

interface AirlinePickerProps {
  accessToken: string;
  onSelect?: (airline: AirlineResponse) => void;
}

// Reusable browse/typeahead picker (TASKS.md T27) — the dataset is small and global
// (seeded once, shared across all Agencies), so it's fetched once and filtered client-side
// for instant results; the same component is reused as a selector in the Booking Wizard (T34).
export function AirlinePicker({ accessToken, onSelect }: AirlinePickerProps) {
  const [airlines, setAirlines] = useState<AirlineResponse[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAirlines(accessToken)
      .then(setAirlines)
      .catch(() => setError('Failed to load airlines'));
  }, [accessToken]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return airlines;
    }
    return airlines.filter(
      (airline) =>
        airline.name.toLowerCase().includes(q) ||
        airline.iataCode.toLowerCase().includes(q) ||
        (airline.icaoCode ?? '').toLowerCase().includes(q),
    );
  }, [airlines, query]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search airlines by name or code…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-3 w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
      />

      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
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
          {results.map((airline) => (
            <tr key={airline.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-mono text-neutral-900">{airline.iataCode}</td>
              <td className="py-2 pr-4 font-mono text-neutral-700">{airline.icaoCode ?? '—'}</td>
              <td className="py-2 pr-4 text-neutral-700">{airline.name}</td>
              {onSelect && (
                <td className="py-2 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(airline)}
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
                No airlines match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
