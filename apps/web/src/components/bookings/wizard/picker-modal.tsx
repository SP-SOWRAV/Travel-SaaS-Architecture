'use client';

import { ReactNode, useEffect } from 'react';

interface PickerModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Thin modal wrapper so T27's AirlinePicker/AirportPicker can be reused as in-wizard
// selectors (TASKS.md T34) without duplicating their search/list logic.
export function PickerModal({ title, onClose, children }: PickerModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
