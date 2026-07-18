import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HashService } from '../../core/auth/hash.service';
import { JwtService } from '../../core/auth/jwt.service';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

  // Identity lookup by email is deliberately unscoped: tenant context does not exist yet
  // at login (it is derived FROM this result), so the base repository's tenant-scoped
  // queries (CODING_STANDARDS §4) do not apply here — same class of exception as the
  // global reference-data repositories.
  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const passwordMatches = await this.hashService.verify(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException();
    }

    const accessToken = this.jwtService.sign({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });

    return { accessToken };
  }
}
