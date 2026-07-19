import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { PaginatedResult } from '../../core/pagination/pagination';
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export interface CustomerResponse {
  id: string;
  agencyId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  passportNumber: string | null;
  nationalityCountryId: string | null;
  dateOfBirth: Date | null;
  addressLine1: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toCustomerResponse(customer: Customer): CustomerResponse {
  const { tenantId, deletedAt: _deletedAt, ...rest } = customer;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  // API_RULES §11: free-text `q` scoped to fullName/email/phone, tenant-scoped implicitly
  // by the repository — never a full-text scan of every column.
  async list(q: string | undefined, page: number, pageSize: number): Promise<PaginatedResult<CustomerResponse>> {
    const where = q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined;
    const result = await this.customerRepository.paginate<Customer>({
      where,
      orderBy: { createdAt: 'desc' },
      page,
      pageSize,
    });
    return { data: result.data.map(toCustomerResponse), meta: result.meta };
  }

  async getById(id: string): Promise<CustomerResponse> {
    const customer = (await this.customerRepository.findById(id)) as Customer | null;
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return toCustomerResponse(customer);
  }

  async create(dto: CreateCustomerDto): Promise<CustomerResponse> {
    const customer = (await this.customerRepository.create({ ...dto })) as Customer;
    return toCustomerResponse(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponse> {
    const customer = (await this.customerRepository.update(id, { ...dto })) as Customer;
    return toCustomerResponse(customer);
  }

  async remove(id: string): Promise<void> {
    await this.customerRepository.delete(id);
  }
}
