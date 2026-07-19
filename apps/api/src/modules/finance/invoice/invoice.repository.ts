import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/repository/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';

export interface CreateInvoiceLineInput {
  description: string;
  quantity: number;
  unitAmount: number;
  lineTotal: number;
  sortOrder: number;
}

export interface CreateInvoiceInput {
  bookingId: string;
  invoiceNumber: string;
  currencyCode: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  lines: CreateInvoiceLineInput[];
}

// Owns Invoice and its direct sub-entity InvoiceLine as one aggregate (CODING_STANDARDS §4)
// — InvoiceLine carries no tenant_id of its own (DATABASE.md §3.16), so tenant safety flows
// from Invoice's own tenant_id column and this repository's base-repository scoping.
@Injectable()
export class InvoiceRepository extends BaseRepository<Prisma.InvoiceDelegate> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCtx: TenantContextService,
  ) {
    super(prisma.invoice, tenantCtx);
  }

  async createWithLines(input: CreateInvoiceInput) {
    const tenantId = this.tenantCtx.requireTenantId();

    const invoiceId = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          bookingId: input.bookingId,
          invoiceNumber: input.invoiceNumber,
          currencyCode: input.currencyCode,
          subtotalAmount: input.subtotalAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
        },
      });

      for (const line of input.lines) {
        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            description: line.description,
            quantity: line.quantity,
            unitAmount: line.unitAmount,
            lineTotal: line.lineTotal,
            sortOrder: line.sortOrder,
          },
        });
      }

      return invoice.id;
    });

    return this.findWithLines(invoiceId);
  }

  findWithLines(id: string) {
    return this.delegate.findFirst({
      where: { id, tenantId: this.tenantCtx.requireTenantId() },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  findByBookingId(bookingId: string) {
    return this.delegate.findFirst({
      where: { bookingId, tenantId: this.tenantCtx.requireTenantId() },
    });
  }

  // T42: Payment recording is what drives an Invoice's own document-level status
  // (issued -> partially_paid -> paid) — a distinct enum from booking lifecycle
  // (DATABASE.md §8), so this is a plain field update, not a Workflow Engine call.
  updateStatus(id: string, status: string) {
    return this.delegate.update({
      where: { id },
      data: { status: status as Prisma.InvoiceUncheckedUpdateInput['status'] },
    });
  }
}
