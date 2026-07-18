'use client';

import { FormEvent, useState } from 'react';
import { CreateBookingPassengerInput, PassengerTypeCode } from '../../../lib/api-client';

interface StepPassengersProps {
  passengers: CreateBookingPassengerInput[];
  onChange: (passengers: CreateBookingPassengerInput[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPassengers({ passengers, onChange, onNext, onBack }: StepPassengersProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passengerType, setPassengerType] = useState<PassengerTypeCode>('ADT');

  const addPassenger = (event: FormEvent) => {
    event.preventDefault();
    onChange([...passengers, { firstName, lastName, passengerType }]);
    setFirstName('');
    setLastName('');
    setPassengerType('ADT');
  };

  const removePassenger = (index: number) => {
    onChange(passengers.filter((_, i) => i !== index));
  };

  return (
    <div>
      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {passengers.map((passenger, index) => (
            <tr key={index} className="border-b border-neutral-100">
              <td className="py-2 pr-4 text-neutral-900">
                {passenger.firstName} {passenger.lastName}
              </td>
              <td className="py-2 pr-4 text-neutral-700">{passenger.passengerType}</td>
              <td className="py-2 pr-4 text-right">
                <button
                  type="button"
                  onClick={() => removePassenger(index)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {passengers.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-neutral-600">
                No passengers added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form onSubmit={addPassenger} className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="passenger-first">
            First Name
          </label>
          <input
            id="passenger-first"
            type="text"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="passenger-last">
            Last Name
          </label>
          <input
            id="passenger-last"
            type="text"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="passenger-type">
            Type
          </label>
          <select
            id="passenger-type"
            value={passengerType}
            onChange={(event) => setPassengerType(event.target.value as PassengerTypeCode)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="ADT">Adult</option>
            <option value="CHD">Child</option>
            <option value="INF">Infant</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Add Passenger
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
          disabled={passengers.length === 0}
          onClick={onNext}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
