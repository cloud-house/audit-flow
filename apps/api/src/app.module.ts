import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DatabaseModule } from './shared/database/database.module';
import { QueueModule } from './infrastructure/queue/bull.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { ClientProjectModule } from './modules/client-project/client-project.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { NotificationModule } from './modules/notification/notification.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),
    DatabaseModule,
    QueueModule,
    AuthModule,
    AnalysisModule,
    ClientProjectModule,
    ReportingModule,
    NotificationModule,
  ],
  providers: [
    // Global validation pipe
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    // Global JWT guard — use @Public() decorator to opt out
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
