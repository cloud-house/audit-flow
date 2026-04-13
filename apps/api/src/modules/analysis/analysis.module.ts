import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { SeoChecker } from './application/checkers/seo-checker';
import { PerformanceChecker } from './application/checkers/performance-checker';
import { StartAuditUseCase } from './application/start-audit.use-case';
import { GetAuditStatusUseCase } from './application/get-audit-status.use-case';

import { AUDIT_REPOSITORY } from './domain/repositories/audit.repository.interface';
import { AuditRepository } from './infrastructure/audit.repository';
import { AuditEntity } from './infrastructure/audit.entity';
import { AuditCheckEntity } from './infrastructure/audit-check.entity';
import { ProjectEntity } from '../client-project/infrastructure/project.entity';
import { AuditQueueConsumer } from './infrastructure/audit.queue.consumer';

import { AuditController } from './api/audit.controller';
import { AuditGateway } from './api/audit.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditEntity, AuditCheckEntity, ProjectEntity]),
    BullModule.registerQueue({ name: 'audits' }),
  ],
  controllers: [AuditController],
  providers: [
    // Domain → Infrastructure binding
    { provide: AUDIT_REPOSITORY, useClass: AuditRepository },

    // Application
    StartAuditUseCase,
    GetAuditStatusUseCase,

    // Checkers
    SeoChecker,
    PerformanceChecker,

    // Infrastructure
    AuditQueueConsumer,

    // API
    AuditGateway,
  ],
  exports: [AUDIT_REPOSITORY],
})
export class AnalysisModule {}
