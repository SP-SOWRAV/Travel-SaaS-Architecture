'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreateBookingFareInput,
  CreateBookingPassengerInput,
  CreateBookingSectorInput,
} from '../../../../src/lib/api-client';
import { useAuth } from '../../../../src/lib/auth-context';
import { StepCustomer } from '../../../../src/components/bookings/wizard/step-customer';
import { StepFares } from '../../../../src/components/bookings/wizard/step-fares';
import { StepIndicator } from '../../../../src/components/bookings/wizard/step-indicator';
import { StepPassengers } from '../../../../src/components/bookings/wizard/step-passengers';
import { StepReview } from '../../../../src/components/bookings/wizard/step-review';
import { StepSectors } from '../../../../src/components/bookings/wizard/step-sectors';

export default function NewBookingPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [passengers, setPassengers] = useState<CreateBookingPassengerInput[]>([]);
  const [sectors, setSectors] = useState<CreateBookingSectorInput[]>([]);
  const [fares, setFares] = useState<CreateBookingFareInput[]>([]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  if (isInitializing || !isAuthenticated || !accessToken) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900">New Booking</h1>

        <StepIndicator currentStep={step} />

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          {step === 0 && (
            <StepCustomer
              accessToken={accessToken}
              customerId={customerId}
              branchId={branchId}
              onChange={(newCustomerId, newBranchId) => {
                setCustomerId(newCustomerId);
                setBranchId(newBranchId);
              }}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <StepPassengers
              passengers={passengers}
              onChange={setPassengers}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <StepSectors
              accessToken={accessToken}
              sectors={sectors}
              onChange={setSectors}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepFares
              passengers={passengers}
              sectors={sectors}
              fares={fares}
              onChange={setFares}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && customerId && branchId && (
            <StepReview
              accessToken={accessToken}
              input={{ customerId, branchId, passengers, sectors, fares }}
              onBack={() => setStep(3)}
              onCreated={(bookingId) => router.push(`/bookings/${bookingId}`)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
