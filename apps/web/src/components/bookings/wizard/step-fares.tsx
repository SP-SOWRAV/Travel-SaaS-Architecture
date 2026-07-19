'use client';

import { FormEvent, useState } from 'react';
import {
  CreateBookingFareInput,
  CreateBookingPassengerInput,
  CreateBookingSectorInput,
  CreateBookingTaxInput,
} from '../../../lib/api-client';

interface StepFaresProps {
  passengers: CreateBookingPassengerInput[];
  sectors: CreateBookingSectorInput[];
  fares: CreateBookingFareInput[];
  onChange: (fares: CreateBookingFareInput[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepFares({ passengers, sectors, fares, onChange, onNext, onBack }: StepFaresProps) {
  const [passengerIndex, setPassengerIndex] = useState(0);
  const [sectorIndex, setSectorIndex] = useState(0);
  const [baseAmount, setBaseAmount] = useState('');
  const [taxes, setTaxes] = useState<CreateBookingTaxInput[]>([]);
  const [taxCode, setTaxCode] = useState('');
  const [taxAmount, setTaxAmount] = useState('');

  const addTax = () => {
    if (!taxCode || !taxAmount) {
      return;
    }
    setTaxes([...taxes, { taxCode, amount: Number(taxAmount) }]);
    setTaxCode('');
    setTaxAmount('');
  };

  const addFare = (event: FormEvent) => {
    event.preventDefault();
    onChange([...fares, { passengerIndex, sectorIndex, baseAmount: Number(baseAmount), taxes }]);
    setBaseAmount('');
    setTaxes([]);
  };

  const removeFare = (index: number) => {
    onChange(fares.filter((_, i) => i !== index));
  };

  const passengerLabel = (index: number) => {
    const p = passengers[index];
    return p ? `${p.firstName} ${p.lastName}` : `Passenger ${index + 1}`;
  };
  const sectorLabel = (index: number) => {
    const s = sectors[index];
    return s ? s.flightNumber : `Sector ${index + 1}`;
  };

  return (
    <div>
      <div className="overflow-x-auto">
      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4 font-medium">Passenger</th>
            <th className="py-2 pr-4 font-medium">Sector</th>
            <th className="py-2 pr-4 font-medium">Base</th>
            <th className="py-2 pr-4 font-medium">Taxes</th>
            <th className="py-2 pr-4 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {fares.map((fare, index) => (
            <tr key={index} className="border-b border-neutral-100">
              <td className="py-2 pr-4 text-neutral-900">{passengerLabel(fare.passengerIndex)}</td>
              <td className="py-2 pr-4 text-neutral-700">{sectorLabel(fare.sectorIndex)}</td>
              <td className="py-2 pr-4 text-neutral-700">{fare.baseAmount}</td>
              <td className="py-2 pr-4 text-neutral-700">
                {(fare.taxes ?? []).map((t) => `${t.taxCode}: ${t.amount}`).join(', ') || '—'}
              </td>
              <td className="py-2 pr-4 text-right">
                <button
                  type="button"
                  onClick={() => removeFare(index)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {fares.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-neutral-600">
                No fares added yet (optional — you can proceed without any).
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <form onSubmit={addFare} className="space-y-3 rounded-md border border-neutral-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="fare-passenger">
              Passenger
            </label>
            <select
              id="fare-passenger"
              value={passengerIndex}
              onChange={(event) => setPassengerIndex(Number(event.target.value))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              {passengers.map((p, index) => (
                <option key={index} value={index}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="fare-sector">
              Sector
            </label>
            <select
              id="fare-sector"
              value={sectorIndex}
              onChange={(event) => setSectorIndex(Number(event.target.value))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              {sectors.map((s, index) => (
                <option key={index} value={index}>
                  {s.flightNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="fare-base">
              Base Amount
            </label>
            <input
              id="fare-base"
              type="number"
              step="0.01"
              min="0"
              required
              value={baseAmount}
              onChange={(event) => setBaseAmount(event.target.value)}
              className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="tax-code">
              Tax Code
            </label>
            <input
              id="tax-code"
              type="text"
              value={taxCode}
              onChange={(event) => setTaxCode(event.target.value)}
              className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="tax-amount">
              Tax Amount
            </label>
            <input
              id="tax-amount"
              type="number"
              step="0.01"
              min="0"
              value={taxAmount}
              onChange={(event) => setTaxAmount(event.target.value)}
              className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={addTax}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Add Tax
          </button>
          {taxes.length > 0 && (
            <span className="text-sm text-neutral-600">
              Pending taxes: {taxes.map((t) => `${t.taxCode}:${t.amount}`).join(', ')}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Add Fare
        </button>
      </form>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
