import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Branch, Prisma } from '@prisma/client';
import { BranchRepository } from './branch.repository';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

export interface BranchResponse {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  addressLine1: string | null;
  cityId: string | null;
  countryId: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toBranchResponse(branch: Branch): BranchResponse {
  const { tenantId, deletedAt: _deletedAt, ...rest } = branch;
  return { ...rest, agencyId: tenantId };
}

function isDuplicateCodeError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

@Injectable()
export class BranchService {
  constructor(private readonly branchRepository: BranchRepository) {}

  async list(): Promise<BranchResponse[]> {
    const branches = (await this.branchRepository.findMany({
      orderBy: { createdAt: 'desc' },
    })) as Branch[];
    return branches.map(toBranchResponse);
  }

  async getById(id: string): Promise<BranchResponse> {
    const branch = (await this.branchRepository.findById(id)) as Branch | null;
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return toBranchResponse(branch);
  }

  async create(dto: CreateBranchDto): Promise<BranchResponse> {
    try {
      const branch = (await this.branchRepository.create({ ...dto })) as Branch;
      return toBranchResponse(branch);
    } catch (err) {
      if (isDuplicateCodeError(err)) {
        throw new ConflictException('Branch code already in use');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateBranchDto): Promise<BranchResponse> {
    try {
      const branch = (await this.branchRepository.update(id, { ...dto })) as Branch;
      return toBranchResponse(branch);
    } catch (err) {
      if (isDuplicateCodeError(err)) {
        throw new ConflictException('Branch code already in use');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.branchRepository.delete(id);
  }
}
