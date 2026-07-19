import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import type { SharedTypesPlaceholder } from '@project/shared-types';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { validate } from './core/config/env.validation';
import { TenantContextMiddleware } from './core/tenant/tenant-context.middleware';
import { ActivityLogInterceptor } from './core/activity-log/activity-log.interceptor';
import { ActivityLogService } from './core/activity-log/activity-log.service';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { HealthController } from './modules/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BranchModule } from './modules/branch/branch.module';
import { UserModule } from './modules/user/user.module';
import { MyProfileModule } from './modules/my-profile/my-profile.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AirportModule } from './modules/airport/airport.module';
import { AirlineModule } from './modules/airline/airline.module';
import { FlightBookingModule } from './modules/flight-booking/flight-booking.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { WorkflowEngineModule } from './workflow-engine/workflow-engine.module';

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
    CustomerModule,
    AirportModule,
    AirlineModule,
    WorkflowEngineModule,
    FlightBookingModule,
    FinanceModule,
    ReportsModule,
    DashboardModule,
    ActivityLogModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    ActivityLogService,
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
