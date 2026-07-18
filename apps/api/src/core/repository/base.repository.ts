import { TenantContextService } from '../tenant/tenant-context.service';

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
  ) {}

  private scopedWhere(where: WhereRecord = {}): WhereRecord {
    return { ...where, tenantId: this.tenantContext.requireTenantId() };
  }

  findMany(args: { where?: WhereRecord; [key: string]: unknown } = {}) {
    const { where, ...rest } = args;
    return this.delegate.findMany({ ...rest, where: this.scopedWhere(where) });
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
    return this.delegate.delete({ where: { id } });
  }

  private async assertBelongsToTenant(id: string): Promise<void> {
    const existing = await this.delegate.findFirst({ where: this.scopedWhere({ id }) });
    if (!existing) {
      throw new Error('Record not found in tenant scope');
    }
  }
}
