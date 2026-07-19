'use client';

import { FormEvent, useState } from 'react';
import {
  AirlineResponse,
  AirportResponse,
  CabinClassCode,
  CreateBookingSectorInput,
} from '../../../lib/api-client';
import { AirlinePicker } from '../../reference-data/airline-picker';
import { AirportPicker } from '../../reference-data/airport-picker';
import { PickerModal } from './picker-modal';

interface StepSectorsProps {
  accessToken: string;
  sectors: CreateBookingSectorInput[];
  onChange: (sectors: CreateBookingSectorInput[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSectors({ accessToken, sectors, onChange, onNext, onBack }: StepSectorsProps) {
  const [airline, setAirline] = useState<AirlineResponse | null>(null);
  const [origin, setOrigin] = useState<AirportResponse | null>(null);
  const [destination, setDestination] = useState<AirportResponse | null>(null);
  const [flightNumber, setFlightNumber] = useState('');
  const [cabinClass, setCabinClass] = useState<CabinClassCode>('economy');
  const [departureAt, setDepartureAt] = useState('');
  const [arrivalAt, setArrivalAt] = useState('');
  const [activePicker, setActivePicker] = useState<'airline' | 'origin' | 'destination' | null>(null);

  const canAdd = airline && origin && destination && flightNumber && departureAt && arrivalAt;

  const addSector = (event: FormEvent) => {
    event.preventDefault();
    if (!airline || !origin || !destination) {
      return;
    }
    onChange([
      ...sectors,
      {
        airlineId: airline.id,
        originAirportId: origin.id,
        destinationAirportId: destination.id,
        flightNumber,
        cabinClass,
        departureAt: new Date(departureAt).toISOString(),
        arrivalAt: new Date(arrivalAt).toISOString(),
        sequenceNumber: sectors.length + 1,
      },
    ]);
    setAirline(null);
    setOrigin(null);
    setDestination(null);
    setFlightNumber('');
    setCabinClass('economy');
    setDepartureAt('');
    setArrivalAt('');
  };

  const removeSector = (index: number) => {
    onChange(sectors.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="overflow-x-auto">
      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4 font-medium">Flight</th>
            <th className="py-2 pr-4 font-medium">Route</th>
            <th className="py-2 pr-4 font-medium">Departure</th>
            <th className="py-2 pr-4 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sectors.map((sector, index) => (
            <tr key={index} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-mono text-neutral-900">{sector.flightNumber}</td>
              <td className="py-2 pr-4 text-neutral-700">
                {sector.originAirportId.slice(0, 8)} → {sector.destinationAirportId.slice(0, 8)}
              </td>
              <td className="py-2 pr-4 text-neutral-700">{sector.departureAt}</td>
              <td className="py-2 pr-4 text-right">
                <button
                  type="button"
                  onClick={() => removeSector(index)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {sectors.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-neutral-600">
                No sectors added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <form onSubmit={addSector} className="space-y-3 rounded-md border border-neutral-200 p-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActivePicker('airline')}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            {airline ? `Airline: ${airline.name} (${airline.iataCode})` : 'Choose Airline…'}
          </button>
          <button
            type="button"
            onClick={() => setActivePicker('origin')}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            {origin ? `From: ${origin.iataCode}` : 'Choose Origin…'}
          </button>
          <button
            type="button"
            onClick={() => setActivePicker('destination')}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            {destination ? `To: ${destination.iataCode}` : 'Choose Destination…'}
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="flight-number">
              Flight Number
            </label>
            <input
              id="flight-number"
              type="text"
              required
              value={flightNumber}
              onChange={(event) => setFlightNumber(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="cabin-class">
              Cabin
            </label>
            <select
              id="cabin-class"
              value={cabinClass}
              onChange={(event) => setCabinClass(event.target.value as CabinClassCode)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="departure-at">
              Departure
            </label>
            <input
              id="departure-at"
              type="datetime-local"
              required
              value={departureAt}
              onChange={(event) => setDepartureAt(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="arrival-at">
              Arrival
            </label>
            <input
              id="arrival-at"
              type="datetime-local"
              required
              value={arrivalAt}
              onChange={(event) => setArrivalAt(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!canAdd}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            Add Sector
          </button>
        </div>
      </form>

      {activePicker === 'airline' && (
        <PickerModal title="Choose Airline" onClose={() => setActivePicker(null)}>
          <AirlinePicker
            accessToken={accessToken}
            onSelect={(selected) => {
              setAirline(selected);
              setActivePicker(null);
            }}
          />
        </PickerModal>
      )}
      {activePicker === 'origin' && (
        <PickerModal title="Choose Origin Airport" onClose={() => setActivePicker(null)}>
          <AirportPicker
            accessToken={accessToken}
            onSelect={(selected) => {
              setOrigin(selected);
              setActivePicker(null);
            }}
          />
        </PickerModal>
      )}
      {activePicker === 'destination' && (
        <PickerModal title="Choose Destination Airport" onClose={() => setActivePicker(null)}>
          <AirportPicker
            accessToken={accessToken}
            onSelect={(selected) => {
              setDestination(selected);
              setActivePicker(null);
            }}
          />
        </PickerModal>
      )}

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
          disabled={sectors.length === 0}
          onClick={onNext}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
