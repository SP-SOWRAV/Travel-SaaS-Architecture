import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { validationExceptionFactory } from '../src/core/filters/validation-exception-factory';

// CODING_STANDARDS §16: "A small set of end-to-end API tests cover the critical path
// only: login -> create booking -> reserve -> issue ticket -> invoice -> pay -> complete,
// plus a tenant-isolation smoke test (two Agencies, cross-access attempt)." Production
// Hardening, Critical finding: this suite did not exist at all before now.
//
// Runs against a real Postgres (the same local dev database DATABASE_URL points at) —
// creates its own two Agencies/users/reference data and cleans up everything it created
// in afterAll, so it never touches or depends on any other seeded/demo data and is safe
// to re-run.
describe('Critical path (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const RUN_ID = Date.now().toString(36);
  const AGENCY_A_EMAIL = `e2e-a-${RUN_ID}@example.com`;
  const AGENCY_B_EMAIL = `e2e-b-${RUN_ID}@example.com`;
  const PASSWORD = 'E2ePassword123';

  let agencyAId: string;
  let agencyBId: string;
  let branchAId: string;
  let customerAId: string;
  let airlineId: string;
  let originAirportId: string;
  let destinationAirportId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirrors main.ts's bootstrap exactly, so the E2E suite exercises the same validation
    // behavior (422 + field-level details) a real client would see.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const agencyA = await prisma.agency.create({ data: { name: `E2E Agency A ${RUN_ID}`, status: 'active' } });
    const agencyB = await prisma.agency.create({ data: { name: `E2E Agency B ${RUN_ID}`, status: 'active' } });
    agencyAId = agencyA.id;
    agencyBId = agencyB.id;

    await prisma.settings.create({
      data: { tenantId: agencyAId, currencyCode: 'USD', timezone: 'UTC', invoicePrefix: 'E2E-INV-', ticketPrefix: 'E2E-TKT-' },
    });
    await prisma.settings.create({
      data: { tenantId: agencyBId, currencyCode: 'USD', timezone: 'UTC', invoicePrefix: 'E2EB-INV-', ticketPrefix: 'E2EB-TKT-' },
    });

    const branchA = await prisma.branch.create({
      data: { tenantId: agencyAId, name: 'HQ', code: `E2E-${RUN_ID}`, isActive: true },
    });
    branchAId = branchA.id;

    await prisma.user.create({
      data: { tenantId: agencyAId, email: AGENCY_A_EMAIL, passwordHash, fullName: 'E2E Admin A', role: 'agency_admin' },
    });
    await prisma.user.create({
      data: { tenantId: agencyBId, email: AGENCY_B_EMAIL, passwordHash, fullName: 'E2E Admin B', role: 'agency_admin' },
    });

    const customerA = await prisma.customer.create({ data: { tenantId: agencyAId, fullName: 'E2E Traveler' } });
    customerAId = customerA.id;

    const airline = await prisma.airline.findFirst();
    const origin = await prisma.airport.findFirst();
    const destination = await prisma.airport.findFirst({ where: { NOT: { id: origin?.id } } });
    if (!airline || !origin || !destination) {
      throw new Error('E2E suite requires Airline/Airport reference data to already be seeded');
    }
    airlineId = airline.id;
    originAirportId = origin.id;
    destinationAirportId = destination.id;
  }, 30000);

  afterAll(async () => {
    // Cascades manually in dependency order — no onDelete rule is configured on these
    // relations (a separate, already-reported finding), so children must go first.
    const bookings = await prisma.booking.findMany({ where: { tenantId: agencyAId } });
    for (const booking of bookings) {
      const invoices = await prisma.invoice.findMany({ where: { bookingId: booking.id } });
      for (const invoice of invoices) {
        const payments = await prisma.payment.findMany({ where: { invoiceId: invoice.id } });
        for (const payment of payments) {
          await prisma.transaction.deleteMany({ where: { referenceTable: 'payments', referenceId: payment.id } });
          await prisma.receipt.deleteMany({ where: { paymentId: payment.id } });
        }
        await prisma.refund.deleteMany({ where: { invoiceId: invoice.id } });
        await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
        await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
      }
      await prisma.invoice.deleteMany({ where: { bookingId: booking.id } });
      await prisma.workflowTransition.deleteMany({ where: { bookingId: booking.id } });
      await prisma.ticket.deleteMany({ where: { bookingId: booking.id } });
      await prisma.tax.deleteMany({ where: { fare: { bookingId: booking.id } } });
      await prisma.fare.deleteMany({ where: { bookingId: booking.id } });
      await prisma.sector.deleteMany({ where: { bookingId: booking.id } });
      await prisma.passenger.deleteMany({ where: { bookingId: booking.id } });
    }
    await prisma.booking.deleteMany({ where: { tenantId: { in: [agencyAId, agencyBId] } } });
    await prisma.customer.deleteMany({ where: { tenantId: { in: [agencyAId, agencyBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [agencyAId, agencyBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [agencyAId, agencyBId] } } });
    await prisma.settings.deleteMany({ where: { tenantId: { in: [agencyAId, agencyBId] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } });

    await app.close();
  }, 30000);

  it('runs the full booking lifecycle: login -> create -> reserve -> issue ticket -> invoice -> pay -> complete', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: AGENCY_A_EMAIL, password: PASSWORD })
      .expect(201);
    const token = login.body.data.accessToken as string;
    expect(token).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customerAId,
        branchId: branchAId,
        passengers: [{ firstName: 'E2E', lastName: 'Passenger', passengerType: 'ADT' }],
        sectors: [
          {
            airlineId,
            originAirportId,
            destinationAirportId,
            flightNumber: 'E2E1',
            departureAt: '2027-01-01T10:00:00Z',
            arrivalAt: '2027-01-01T13:00:00Z',
          },
        ],
        fares: [{ passengerIndex: 0, sectorIndex: 0, baseAmount: 100, taxes: [] }],
      })
      .expect(201);
    const bookingId = created.body.data.id as string;
    expect(created.body.data.status).toBe('draft');

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201)
      .expect((res) => expect(res.body.data.status).toBe('reserved'));

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/issue-ticket`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201)
      .expect((res) => expect(res.body.data.status).toBe('ticket_issued'));

    const invoiced = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/invoice`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    const invoiceId = invoiced.body.data.id as string;
    // Asserted as a number, not an exact string: whole-currency amounts (100) and
    // fractional ones (100.50) are not guaranteed identical string formatting from
    // Prisma's Decimal serialization, which is a separate, already-noted concern from
    // this suite's actual job (behavior, not wire-format cosmetics).
    expect(Number(invoiced.body.data.totalAmount)).toBe(100);

    const bookingAfterInvoice = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(bookingAfterInvoice.body.data.status).toBe('invoiced');

    await request(app.getHttpServer())
      .post(`/api/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100, paymentMethod: 'cash' })
      .expect(201);

    const bookingAfterPayment = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    // Full single payment settles the invoice, so the Workflow Engine advances the
    // booking through Paid to Completed in the same call (MASTER.md §5).
    expect(bookingAfterPayment.body.data.status).toBe('completed');

    const history = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}/transitions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const path = history.body.data.map((t: { fromStage: string; toStage: string }) => `${t.fromStage}->${t.toStage}`);
    expect(path).toEqual([
      'draft->reserved',
      'reserved->ticket_issued',
      'ticket_issued->invoiced',
      'invoiced->paid',
      'paid->completed',
    ]);
  }, 30000);

  it('never returns another Agency\'s data — cross-tenant access is 404, not 403 or data', async () => {
    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: AGENCY_A_EMAIL, password: PASSWORD })
      .expect(201);
    const tokenA = loginA.body.data.accessToken as string;

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: AGENCY_B_EMAIL, password: PASSWORD })
      .expect(201);
    const tokenB = loginB.body.data.accessToken as string;

    const bookingsA = await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(bookingsA.body.data.length).toBeGreaterThan(0);
    const knownBookingId = bookingsA.body.data[0].id as string;

    // Agency B, holding a real token, tries a known Agency A booking id.
    const crossTenantRead = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${knownBookingId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    expect(crossTenantRead.body.error.code).toBe('RESOURCE_NOT_FOUND');

    const crossTenantCancel = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${knownBookingId}/cancel`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ reason: 'cross-tenant probe' })
      .expect(404);
    expect(crossTenantCancel.body.error.code).toBe('RESOURCE_NOT_FOUND');

    // Agency B's own list is empty of Agency A's bookings.
    const bookingsB = await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(bookingsB.body.data.find((b: { id: string }) => b.id === knownBookingId)).toBeUndefined();
  }, 30000);
});
