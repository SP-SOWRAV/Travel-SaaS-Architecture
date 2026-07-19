import { Booking, BookingStatus, Branch, Customer, PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// DEVELOPMENT_RULES §6: idempotent, safe to re-run without duplicating rows; a
// Local/Staging-only tool for exercising every workflow stage and proving tenant
// isolation — never run against Production, whose first Agency row is always a real one.
const DEMO_PASSWORD = 'Demo@12345';

interface AgencySpec {
  name: string;
  adminEmail: string;
  invoicePrefix: string;
  ticketPrefix: string;
  branchCode: string;
  customerName: string;
}

const AGENCIES: AgencySpec[] = [
  {
    name: 'Demo Travel Agency A',
    adminEmail: 'demo-a-admin@example.com',
    invoicePrefix: 'INV-A-',
    ticketPrefix: 'TKT-A-',
    branchCode: 'HQ-A',
    customerName: 'Alice Traveler',
  },
  {
    name: 'Demo Travel Agency B',
    adminEmail: 'demo-b-admin@example.com',
    invoicePrefix: 'INV-B-',
    ticketPrefix: 'TKT-B-',
    branchCode: 'HQ-B',
    customerName: 'Bob Traveler',
  },
];

// The full canonical path from Draft to each target stage (MASTER.md §5) — Cancelled is
// reached from Reserved (a pre-payment stage) rather than Draft, so both pre-payment exit
// points get demo coverage across the two seeded Agencies' stage sets.
const STAGE_PATHS: Record<BookingStatus, { from: BookingStatus | null; to: BookingStatus }[]> = {
  draft: [],
  reserved: [{ from: 'draft', to: 'reserved' }],
  ticket_issued: [
    { from: 'draft', to: 'reserved' },
    { from: 'reserved', to: 'ticket_issued' },
  ],
  invoiced: [
    { from: 'draft', to: 'reserved' },
    { from: 'reserved', to: 'ticket_issued' },
    { from: 'ticket_issued', to: 'invoiced' },
  ],
  paid: [
    { from: 'draft', to: 'reserved' },
    { from: 'reserved', to: 'ticket_issued' },
    { from: 'ticket_issued', to: 'invoiced' },
    { from: 'invoiced', to: 'paid' },
  ],
  completed: [
    { from: 'draft', to: 'reserved' },
    { from: 'reserved', to: 'ticket_issued' },
    { from: 'ticket_issued', to: 'invoiced' },
    { from: 'invoiced', to: 'paid' },
    { from: 'paid', to: 'completed' },
  ],
  refunded: [
    { from: 'draft', to: 'reserved' },
    { from: 'reserved', to: 'ticket_issued' },
    { from: 'ticket_issued', to: 'invoiced' },
    { from: 'invoiced', to: 'paid' },
    { from: 'paid', to: 'completed' },
    { from: 'completed', to: 'refunded' },
  ],
  cancelled: [
    { from: 'draft', to: 'reserved' },
    { from: 'reserved', to: 'cancelled' },
  ],
};

const BOOKING_AMOUNT = 250;

interface AgencyContext {
  agencyId: string;
  branch: Branch;
  admin: User;
  customer: Customer;
}

async function upsertAgency(spec: AgencySpec): Promise<AgencyContext> {
  let agency = await prisma.agency.findFirst({ where: { name: spec.name } });
  if (!agency) {
    agency = await prisma.agency.create({ data: { name: spec.name, status: 'active' } });
  }

  await prisma.settings.upsert({
    where: { tenantId: agency.id },
    update: {},
    create: {
      tenantId: agency.id,
      currencyCode: 'USD',
      timezone: 'UTC',
      invoicePrefix: spec.invoicePrefix,
      ticketPrefix: spec.ticketPrefix,
    },
  });

  let branch = await prisma.branch.findFirst({ where: { tenantId: agency.id, code: spec.branchCode } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: { tenantId: agency.id, name: 'Head Office', code: spec.branchCode, isActive: true },
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: spec.adminEmail },
    update: {},
    create: {
      tenantId: agency.id,
      branchId: branch.id,
      email: spec.adminEmail,
      passwordHash,
      fullName: `${spec.name} Admin`,
      role: 'agency_admin',
      isActive: true,
    },
  });

  let customer = await prisma.customer.findFirst({ where: { tenantId: agency.id, fullName: spec.customerName } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: agency.id,
        fullName: spec.customerName,
        email: `${spec.customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      },
    });
  }

  return { agencyId: agency.id, branch, admin, customer };
}

// Builds one Booking + Passenger/Sector/Fare and replays the transition history a real
// Workflow Engine call would have produced to reach `targetStatus` (MASTER.md §5) —
// including the Invoice/Payment/Receipt/Refund/Transaction rows each stage implies, so
// the seeded data exercises every Finance table too, not just Booking.status.
async function ensureBooking(
  ctx: AgencyContext,
  reference: string,
  targetStatus: BookingStatus,
  airlineId: string,
  originAirportId: string,
  destinationAirportId: string,
): Promise<Booking> {
  const existing = await prisma.booking.findFirst({
    where: { tenantId: ctx.agencyId, bookingReference: reference },
  });
  if (existing) {
    return existing;
  }

  const booking = await prisma.booking.create({
    data: {
      tenantId: ctx.agencyId,
      bookingReference: reference,
      customerId: ctx.customer.id,
      branchId: ctx.branch.id,
      agentId: ctx.admin.id,
      status: 'draft',
      currencyCode: 'USD',
      totalAmount: BOOKING_AMOUNT,
    },
  });

  const passenger = await prisma.passenger.create({
    data: { bookingId: booking.id, firstName: 'Demo', lastName: 'Passenger', passengerType: 'ADT' },
  });
  const sector = await prisma.sector.create({
    data: {
      bookingId: booking.id,
      airlineId,
      originAirportId,
      destinationAirportId,
      flightNumber: 'DEMO1',
      departureAt: new Date('2026-10-01T10:00:00Z'),
      arrivalAt: new Date('2026-10-01T13:00:00Z'),
    },
  });
  await prisma.fare.create({
    data: {
      bookingId: booking.id,
      passengerId: passenger.id,
      sectorId: sector.id,
      baseAmount: BOOKING_AMOUNT,
      currencyCode: 'USD',
    },
  });

  const path = STAGE_PATHS[targetStatus];
  for (const step of path) {
    const isTerminalReason = step.to === 'cancelled' || step.to === 'refunded';
    await prisma.workflowTransition.create({
      data: {
        bookingId: booking.id,
        fromStage: step.from,
        toStage: step.to,
        actorId: ctx.admin.id,
        reason: isTerminalReason ? 'Demo seed data' : null,
      },
    });
  }
  await prisma.booking.update({ where: { id: booking.id }, data: { status: targetStatus } });

  const reachedInvoiced = ['invoiced', 'paid', 'completed', 'refunded'].includes(targetStatus);
  if (reachedInvoiced) {
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: ctx.agencyId,
        bookingId: booking.id,
        invoiceNumber: `${reference}-INV`,
        currencyCode: 'USD',
        subtotalAmount: BOOKING_AMOUNT,
        taxAmount: 0,
        totalAmount: BOOKING_AMOUNT,
        status: targetStatus === 'invoiced' ? 'issued' : 'paid',
      },
    });
    await prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description: 'Fare - Demo Passenger - DEMO1',
        quantity: 1,
        unitAmount: BOOKING_AMOUNT,
        lineTotal: BOOKING_AMOUNT,
        sortOrder: 0,
      },
    });

    const reachedPaid = ['paid', 'completed', 'refunded'].includes(targetStatus);
    if (reachedPaid) {
      const payment = await prisma.payment.create({
        data: {
          tenantId: ctx.agencyId,
          invoiceId: invoice.id,
          amount: BOOKING_AMOUNT,
          currencyCode: 'USD',
          paymentMethod: 'card',
          receivedBy: ctx.admin.id,
        },
      });
      await prisma.receipt.create({
        data: { tenantId: ctx.agencyId, paymentId: payment.id, receiptNumber: `${reference}-RCPT` },
      });
      await prisma.transaction.create({
        data: {
          tenantId: ctx.agencyId,
          type: 'payment',
          referenceTable: 'payments',
          referenceId: payment.id,
          amount: BOOKING_AMOUNT,
          currencyCode: 'USD',
          createdBy: ctx.admin.id,
        },
      });

      if (targetStatus === 'refunded') {
        const refund = await prisma.refund.create({
          data: {
            tenantId: ctx.agencyId,
            invoiceId: invoice.id,
            paymentId: payment.id,
            amount: BOOKING_AMOUNT,
            currencyCode: 'USD',
            reason: 'Demo seed data',
            processedBy: ctx.admin.id,
          },
        });
        await prisma.transaction.create({
          data: {
            tenantId: ctx.agencyId,
            type: 'refund',
            referenceTable: 'refunds',
            referenceId: refund.id,
            amount: -BOOKING_AMOUNT,
            currencyCode: 'USD',
            createdBy: ctx.admin.id,
          },
        });
      }
    }
  }

  return prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
}

async function main() {
  const airline = await prisma.airline.findFirst();
  const originAirport = await prisma.airport.findFirst();
  const destinationAirport = await prisma.airport.findFirst({ where: { NOT: { id: originAirport?.id } } });

  if (!airline || !originAirport || !destinationAirport) {
    throw new Error(
      'full.seed.ts requires Airline/Airport reference data to already be seeded (run geo/airport/airline seeds first)',
    );
  }

  const stages: BookingStatus[] = [
    'draft',
    'reserved',
    'ticket_issued',
    'invoiced',
    'paid',
    'completed',
    'refunded',
    'cancelled',
  ];

  for (const spec of AGENCIES) {
    const ctx = await upsertAgency(spec);
    const prefix = spec.branchCode;

    for (const stage of stages) {
      await ensureBooking(
        ctx,
        `DEMO-${prefix}-${stage.toUpperCase()}`,
        stage,
        airline.id,
        originAirport.id,
        destinationAirport.id,
      );
    }

    console.log(`Seeded/verified Agency "${spec.name}" with ${stages.length} bookings across every stage.`);
  }

  console.log(`Demo login password for both admin accounts: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
