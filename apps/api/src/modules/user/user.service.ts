import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { HashService } from '../../core/auth/hash.service';
import { BranchService } from '../branch/branch.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './user.repository';

export interface UserResponse {
  id: string;
  agencyId: string | null;
  branchId: string | null;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// API_RULES §6/§20 (tenant_id -> agencyId) and §21 (password hash never leaves the API).
function toUserResponse(user: User): UserResponse {
  const { tenantId, passwordHash: _passwordHash, deletedAt: _deletedAt, ...rest } = user;
  return { ...rest, agencyId: tenantId };
}

function isDuplicateEmailError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashService: HashService,
    private readonly branchService: BranchService,
  ) {}

  // A referenced branchId must exist within the caller's own Agency — a cross-tenant or
  // unknown branchId fails as a body-validation error (422), not a 404 lookup (API_RULES §5).
  private async assertBranchInTenant(branchId: string | undefined): Promise<void> {
    if (!branchId) {
      return;
    }
    try {
      await this.branchService.getById(branchId);
    } catch {
      throw new UnprocessableEntityException(
        'branchId must reference an existing branch in this Agency',
      );
    }
  }

  async list(): Promise<UserResponse[]> {
    const users = (await this.userRepository.findMany({
      orderBy: { createdAt: 'desc' },
    })) as User[];
    return users.map(toUserResponse);
  }

  async getById(id: string): Promise<UserResponse> {
    const user = (await this.userRepository.findById(id)) as User | null;
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    await this.assertBranchInTenant(dto.branchId);
    const passwordHash = await this.hashService.hash(dto.password);
    try {
      const user = (await this.userRepository.create({
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
        branchId: dto.branchId,
        phone: dto.phone,
      })) as User;
      return toUserResponse(user);
    } catch (err) {
      if (isDuplicateEmailError(err)) {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    await this.assertBranchInTenant(dto.branchId);
    const user = (await this.userRepository.update(id, { ...dto })) as User;
    return toUserResponse(user);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  // Owned by User (Clean Architecture, CODING_STANDARDS §3) so My Profile (T21) reaches
  // password data only through this Service, never the Repository directly.
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = (await this.userRepository.findById(userId)) as User | null;
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const matches = await this.hashService.verify(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await this.hashService.hash(newPassword);
    await this.userRepository.update(userId, { passwordHash });
  }
}
