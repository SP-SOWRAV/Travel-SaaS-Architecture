import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { SharedTypesPlaceholder } from '@project/shared-types';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './core/config/env.validation';
import { PrismaService } from './core/database/prisma.service';
import { TenantContextMiddleware } from './core/tenant/tenant-context.middleware';
import { TenantContextService } from './core/tenant/tenant-context.service';
import { HealthController } from './modules/health/health.controller';

export type _SharedTypesImportCheck = SharedTypesPlaceholder;

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate })],
  controllers: [AppController, HealthController],
  providers: [AppService, PrismaService, TenantContextService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
