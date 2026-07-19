import { NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { buildMeta, PaginatedResult } from '../pagination/pagination';

type WhereRecord = Record<string, unknown>;

interface TenantScopedDelegate {
  findMany(args?: { where?: WhereRecord; [key: string]: unknown }): Promise<unknown[]>;
  findFirst(args?: { where?: WhereRecord; [key: string]: unknown }): Promise<unknown>;
  count(args?: { where?: WhereRecord; [key: string]: unknown }): Promise<number>;
  create(args: { data: WhereRecord; [key: string]: unknown }): Promise<unknown>;
  update(args: { where: WhereRecord; data: WhereRecord }): Promise<unknown>;
  delete(args: { where: WhereRecord }): Promise<unknown>;
}

/**
 * Every Agency-scoped repository extends this class instead of touching Prisma directly
 * (CODING_STANDARDS §4). Tenant scope is always read from request context — never accepted
 * as a caller-supplied parameter — so a call site cannot forget or spoof it.
 */
export abstract class BaseRepository<TDelegate extends TenantScopedDelegate> {
  protected constructor(
    protected readonly delegate: TDelegate,
    private readonly tenantContext: TenantContextService,
    // Opt-in per DATABASE.md §4/§5: only models with a deletedAt column (e.g. Branch) pass
    // true. Settings and other non-soft-deletable models keep today's behavior untouched.
    private readonly softDelete: boolean = false,
  ) {}

  private scopedWhere(where: WhereRecord = {}): WhereRecord {
    const scoped = { ...where, tenantId: this.tenantContext.requireTenantId() };
    return this.softDelete ? { ...scoped, deletedAt: null } : scoped;
  }

  findMany(args: { where?: WhereRecord; [key: string]: unknown } = {}) {
    const { where, ...rest } = args;
    return this.delegate.findMany({ ...rest, where: this.scopedWhere(where) });
  }

  // API_RULES §8: every list endpoint returns this same { data, meta } shape — page/
  // pageSize already normalized and clamped by the caller (core/pagination).
  async paginate<T = unknown>(args: {
    where?: WhereRecord;
    orderBy?: unknown;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<T>> {
    const scopedWhere = this.scopedWhere(args.where);
    const skip = (args.page - 1) * args.pageSize;
    const [data, totalItems] = await Promise.all([
      this.delegate.findMany({ where: scopedWhere, orderBy: args.orderBy, skip, take: args.pageSize }),
      this.delegate.count({ where: scopedWhere }),
    ]);
    return { data: data as T[], meta: buildMeta(args.page, args.pageSize, totalItems) };
  }

  findFirst(args: { where?: WhereRecord; [key: string]: unknown } = {}) {
    const { where, ...rest } = args;
    return this.delegate.findFirst({ ...rest, where: this.scopedWhere(where) });
  }

  findById(id: string) {
    return this.delegate.findFirst({ where: this.scopedWhere({ id }) });
  }

  count(where: WhereRecord = {}) {
    return this.delegate.count({ where: this.scopedWhere(where) });
  }

  create(data: WhereRecord) {
    return this.delegate.create({ data: { ...data, tenantId: this.tenantContext.requireTenantId() } });
  }

  async update(id: string, data: WhereRecord) {
    await this.assertBelongsToTenant(id);
    return this.delegate.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.assertBelongsToTenant(id);
    if (this.softDelete) {
      return this.delegate.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    return this.delegate.delete({ where: { id } });
  }

  // Cross-tenant access must read as "doesn't exist" (API_RULES §4/§20) — a plain Error
  // here would otherwise surface as an uncaught 500, not the required 404.
  private async assertBelongsToTenant(id: string): Promise<void> {
    const existing = await this.delegate.findFirst({ where: this.scopedWhere({ id }) });
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
  }
}
