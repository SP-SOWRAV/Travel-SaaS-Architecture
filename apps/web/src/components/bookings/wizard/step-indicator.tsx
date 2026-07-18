'use client';

const STEPS = ['Customer', 'Passengers', 'Sectors', 'Fare & Tax', 'Review'];

interface StepIndicatorProps {
  currentStep: number; // 0-based
}

// Persistent step indicator (UI_GUIDELINES §11) for the multi-step Booking Wizard.
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm">
      {STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              index === currentStep
                ? 'bg-blue-600 text-white'
                : index < currentStep
                  ? 'bg-green-100 text-green-700'
                  : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {index + 1}
          </span>
          <span className={index === currentStep ? 'font-medium text-neutral-900' : 'text-neutral-500'}>
            {label}
          </span>
          {index < STEPS.length - 1 && <span className="mx-2 text-neutral-300">—</span>}
        </li>
      ))}
    </ol>
  );
}
