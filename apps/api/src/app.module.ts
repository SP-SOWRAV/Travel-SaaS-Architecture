import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { SharedTypesPlaceholder } from '@project/shared-types';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { validate } from './core/config/env.validation';
import { TenantContextMiddleware } from './core/tenant/tenant-context.middleware';
import { HealthController } from './modules/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BranchModule } from './modules/branch/branch.module';
import { UserModule } from './modules/user/user.module';
import { MyProfileModule } from './modules/my-profile/my-profile.module';

export type _SharedTypesImportCheck = SharedTypesPlaceholder;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    CoreModule,
    AuthModule,
    SettingsModule,
    BranchModule,
    UserModule,
    MyProfileModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
