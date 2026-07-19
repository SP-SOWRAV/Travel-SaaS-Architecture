'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiRequestError,
  InvoiceResponse,
  PaymentResponse,
  RefundResponse,
  generateInvoice,
  listInvoices,
  listPaymentsForInvoice,
  listRefundsForInvoice,
} from '../../lib/api-client';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { PaymentForm } from './payment-form';
import { RefundForm } from './refund-form';

interface FinancePanelProps {
  accessToken: string;
  bookingId: string;
  bookingStatus: string;
  currencyCode: string;
  onBookingChanged: () => void;
}

// Invoice / Payment / Receipt / Refund view + actions on the Booking detail page
// (TASKS.md T45) — a thin composition over the Finance endpoints (T41-T43), reusing the
// standard card/table patterns rather than inventing Finance-specific layout.
export function FinancePanel({ accessToken, bookingId, bookingStatus, currencyCode, onBookingChanged }: FinancePanelProps) {
  const [invoice, setInvoice] = useState<InvoiceResponse | null | undefined>(undefined);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [refunds, setRefunds] = useState<RefundResponse[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const invoices = await listInvoices(accessToken, { bookingId });
    const current = invoices[0] ?? null;
    setInvoice(current);
    if (current) {
      const [paymentList, refundList] = await Promise.all([
        listPaymentsForInvoice(accessToken, current.id),
        listRefundsForInvoice(accessToken, current.id),
      ]);
      setPayments(paymentList);
      setRefunds(refundList);
    } else {
      setPayments([]);
      setRefunds([]);
    }
  }, [accessToken, bookingId]);

  useEffect(() => {
    load().catch(() => setError('Failed to load finance data'));
  }, [load]);

  const handleGenerateInvoice = async () => {
    setError(null);
    setGenerating(true);
    try {
      await generateInvoice(accessToken, bookingId);
      await load();
      onBookingChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  if (invoice === undefined) {
    return null;
  }

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalRefunded = refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
  const remaining = invoice ? Number(invoice.totalAmount) - totalPaid : 0;
  const availableToRefund = totalPaid - totalRefunded;
  const canRecordPayment = invoice && invoice.status !== 'paid' && invoice.status !== 'void' && remaining > 0;
  const canProcessRefund =
    invoice && (bookingStatus === 'paid' || bookingStatus === 'completed') && availableToRefund > 0;

  return (
    <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">Finance</h2>

      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!invoice && bookingStatus === 'ticket_issued' && (
        <button
          type="button"
          onClick={handleGenerateInvoice}
          disabled={generating}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate Invoice'}
        </button>
      )}

      {!invoice && bookingStatus !== 'ticket_issued' && (
        <p className="text-sm text-neutral-600">No invoice yet — available once the ticket has been issued.</p>
      )}

      {invoice && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-neutral-900">{invoice.invoiceNumber}</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <dl className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-neutral-500">Subtotal</dt>
              <dd className="text-neutral-900">{invoice.subtotalAmount} {invoice.currencyCode}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Tax</dt>
              <dd className="text-neutral-900">{invoice.taxAmount} {invoice.currencyCode}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Total</dt>
              <dd className="text-neutral-900">{invoice.totalAmount} {invoice.currencyCode}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Outstanding</dt>
              <dd className="text-neutral-900">{remaining.toFixed(2)} {invoice.currencyCode}</dd>
            </div>
          </dl>

          {invoice.lines && invoice.lines.length > 0 && (
            <table className="mb-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 text-neutral-700">{line.description}</td>
                    <td className="py-2 pr-4 text-right text-neutral-900">{line.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 className="mb-2 text-sm font-semibold text-neutral-900">Payments ({payments.length})</h3>
          {payments.length > 0 ? (
            <table className="mb-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Method</th>
                  <th className="py-2 pr-4 font-medium">Receipt</th>
                  <th className="py-2 pr-4 font-medium">Paid At</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 text-neutral-900">{payment.amount} {payment.currencyCode}</td>
                    <td className="py-2 pr-4 text-neutral-700">{payment.paymentMethod}</td>
                    <td className="py-2 pr-4 font-mono text-neutral-700">
                      {payment.receipt?.receiptNumber ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-neutral-700">{new Date(payment.paidAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mb-4 text-sm text-neutral-600">No payments recorded yet.</p>
          )}

          {refunds.length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">Refunds ({refunds.length})</h3>
              <table className="mb-4 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Reason</th>
                    <th className="py-2 pr-4 font-medium">Refunded At</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="border-b border-neutral-100">
                      <td className="py-2 pr-4 text-neutral-900">{refund.amount} {refund.currencyCode}</td>
                      <td className="py-2 pr-4 text-neutral-700">{refund.reason}</td>
                      <td className="py-2 pr-4 text-neutral-700">{new Date(refund.refundedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="flex flex-wrap gap-3">
            {canRecordPayment && !showPaymentForm && (
              <button
                type="button"
                onClick={() => setShowPaymentForm(true)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Record Payment
              </button>
            )}
            {canProcessRefund && !showRefundForm && (
              <button
                type="button"
                onClick={() => setShowRefundForm(true)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Process Refund
              </button>
            )}
          </div>

          {showPaymentForm && (
            <PaymentForm
              accessToken={accessToken}
              invoiceId={invoice.id}
              remaining={remaining}
              currencyCode={invoice.currencyCode}
              onCancel={() => setShowPaymentForm(false)}
              onRecorded={() => {
                setShowPaymentForm(false);
                load().catch(() => setError('Failed to refresh finance data'));
                onBookingChanged();
              }}
            />
          )}

          {showRefundForm && (
            <RefundForm
              accessToken={accessToken}
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
              available={availableToRefund}
              currencyCode={invoice.currencyCode}
              onCancel={() => setShowRefundForm(false)}
              onProcessed={() => {
                setShowRefundForm(false);
                load().catch(() => setError('Failed to refresh finance data'));
                onBookingChanged();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
