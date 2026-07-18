import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SharedTypesPlaceholder } from '@project/shared-types';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './core/config/env.validation';
import { PrismaService } from './core/database/prisma.service';
import { HashService } from './core/auth/hash.service';
import { JwtService } from './core/auth/jwt.service';
import { JwtStrategy } from './core/auth/jwt.strategy';
import { TenantContextMiddleware } from './core/tenant/tenant-context.middleware';
import { TenantContextService } from './core/tenant/tenant-context.service';
import { HealthController } from './modules/health/health.controller';

export type _SharedTypesImportCheck = SharedTypesPlaceholder;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
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
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    PrismaService,
    TenantContextService,
    HashService,
    JwtService,
    JwtStrategy,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
