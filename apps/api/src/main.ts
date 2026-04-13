import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [
      'http://localhost:3000', // shell
      'http://localhost:3001', // mfe-inventory
      'http://localhost:3002', // mfe-analyzer
      'http://localhost:3003', // mfe-reports
    ],
    credentials: true,
  });

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);

  Logger.log(`AuditFlow API running on http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();
