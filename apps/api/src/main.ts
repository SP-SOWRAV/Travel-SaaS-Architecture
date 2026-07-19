import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './core/config/env.validation';
import { validationExceptionFactory } from './core/filters/validation-exception-factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // API_RULES §21: CORS restricted to known frontend origins, never '*'.
  const configService = app.get(ConfigService<EnvironmentVariables>);
  const corsOrigin = configService.get('CORS_ORIGIN', { infer: true }) as string;
  app.enableCors({ origin: corsOrigin.split(',').map((origin) => origin.trim()), credentials: true });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
