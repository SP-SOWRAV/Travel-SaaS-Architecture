import { buildMeta, PaginatedResult } from '../pagination/pagination';

type WhereRecord = Record<string, unknown>;

interface GlobalDelegate {
  findMany(args?: { where?: WhereRecord; [key: string]: unknown }): Promise<unknown[]>;
  findFirst(args?: { where?: WhereRecord; [key: string]: unknown }): Promise<unknown>;
  count(args?: { where?: WhereRecord; [key: string]: unknown }): Promise<number>;
  create(args: { data: WhereRecord; [key: string]: unknown }): Promise<unknown>;
  update(args: { where: WhereRecord; data: WhereRecord }): Promise<unknown>;
}

/**
 * Base for global reference-data repositories (Country/City/Airport/Airline,
 * CODING_STANDARDS §4) — deliberately unscoped, since these tables carry no tenant_id
 * (DATABASE.md §3.6). No delete(): global rows are deactivated (isActive=false), never
 * removed, so historical bookings can still resolve a retired reference.
 */
export abstract class GlobalRepository<TDelegate extends GlobalDelegate> {
  protected constructor(protected readonly delegate: TDelegate) {}

  findMany(args: { where?: WhereRecord; [key: string]: unknown } = {}) {
    return this.delegate.findMany(args);
  }

  async paginate<T = unknown>(args: {
    where?: WhereRecord;
    orderBy?: unknown;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<T>> {
    const skip = (args.page - 1) * args.pageSize;
    const [data, totalItems] = await Promise.all([
      this.delegate.findMany({ where: args.where, orderBy: args.orderBy, skip, take: args.pageSize }),
      this.delegate.count({ where: args.where }),
    ]);
    return { data: data as T[], meta: buildMeta(args.page, args.pageSize, totalItems) };
  }

  findById(id: string) {
    return this.delegate.findFirst({ where: { id } });
  }

  create(data: WhereRecord) {
    return this.delegate.create({ data });
  }

  update(id: string, data: WhereRecord) {
    return this.delegate.update({ where: { id }, data });
  }
}
