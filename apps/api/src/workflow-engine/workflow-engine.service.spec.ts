import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WorkflowStage } from '@project/shared-types';
import { PrismaService } from '../core/database/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { InvalidWorkflowTransitionException } from '../core/filters/exceptions';
import { TransitionHistoryService } from './transition-history.service';
import { WorkflowEngineService } from './workflow-engine.service';

describe('WorkflowEngineService', () => {
  const TENANT_ID = 'tenant-1';
  const BOOKING_ID = 'booking-1';
  const ACTOR_ID = 'user-1';

  let service: WorkflowEngineService;
  let prisma: { booking: { findFirst: jest.Mock; update: jest.Mock } };
  let transitionHistory: { record: jest.Mock };

  beforeEach(async () => {
    prisma = { booking: { findFirst: jest.fn(), update: jest.fn() } };
    transitionHistory = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: { requireTenantId: () => TENANT_ID } },
        { provide: TransitionHistoryService, useValue: transitionHistory },
      ],
    }).compile();

    service = moduleRef.get(WorkflowEngineService);
  });

  it('applies a valid transition, updates the booking, and records history', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: BOOKING_ID, status: 'draft' });
    prisma.booking.update.mockResolvedValue({ id: BOOKING_ID, status: 'reserved' });

    const result = await service.transition(BOOKING_ID, WorkflowStage.Reserved, ACTOR_ID);

    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, tenantId: TENANT_ID },
    });
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { status: 'reserved' },
    });
    expect(transitionHistory.record).toHaveBeenCalledWith({
      bookingId: BOOKING_ID,
      fromStage: 'draft',
      toStage: WorkflowStage.Reserved,
      actorId: ACTOR_ID,
      reason: undefined,
    });
    expect(result).toEqual({ id: BOOKING_ID, status: 'reserved' });
  });

  it('rejects an illegal transition with allowed-next-stages in the error details', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: BOOKING_ID, status: 'draft' });

    await expect(service.transition(BOOKING_ID, WorkflowStage.Paid, ACTOR_ID)).rejects.toThrow(
      InvalidWorkflowTransitionException,
    );
    expect(prisma.booking.update).not.toHaveBeenCalled();
    expect(transitionHistory.record).not.toHaveBeenCalled();

    try {
      await service.transition(BOOKING_ID, WorkflowStage.Paid, ACTOR_ID);
      fail('expected transition to throw');
    } catch (err) {
      const body = (err as InvalidWorkflowTransitionException).getResponse() as {
        code: string;
        details: { allowedTransitions: string[] };
      };
      expect(body.code).toBe('INVALID_TRANSITION');
      expect(body.details.allowedTransitions).toEqual(['reserved', 'cancelled']);
    }
  });

  it('requires a reason to cancel, and accepts the transition once one is given', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: BOOKING_ID, status: 'draft' });

    await expect(service.transition(BOOKING_ID, WorkflowStage.Cancelled, ACTOR_ID)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.booking.update).not.toHaveBeenCalled();

    prisma.booking.update.mockResolvedValue({ id: BOOKING_ID, status: 'cancelled' });
    await service.transition(BOOKING_ID, WorkflowStage.Cancelled, ACTOR_ID, 'Customer changed mind');
    expect(prisma.booking.update).toHaveBeenCalled();
  });

  it('requires a reason to refund, matching the cancel rule', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: BOOKING_ID, status: 'paid' });

    await expect(service.transition(BOOKING_ID, WorkflowStage.Refunded, ACTOR_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('treats a booking not found for the current tenant as 404, never as data from another tenant', async () => {
    // T50 hardening: the lookup itself is tenant-scoped, so a cross-tenant bookingId
    // resolves to "not found" here — this test pins that behavior down.
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(service.transition(BOOKING_ID, WorkflowStage.Reserved, ACTOR_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});
