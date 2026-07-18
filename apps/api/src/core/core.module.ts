import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HashService } from './auth/hash.service';
import { JwtService } from './auth/jwt.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { PrismaService } from './database/prisma.service';
import { TenantContextService } from './tenant/tenant-context.service';

/**
 * Single source for services shared across feature modules (PrismaService, HashService,
 * JwtService) so each is instantiated once (CODING_STANDARDS §9) instead of re-provided
 * per module. Feature modules import CoreModule to reach them.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') as string,
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        } as JwtSignOptions,
      }),
    }),
  ],
  providers: [PrismaService, TenantContextService, HashService, JwtService, JwtStrategy],
  exports: [PrismaService, TenantContextService, HashService, JwtService, JwtModule, PassportModule],
})
export class CoreModule {}
