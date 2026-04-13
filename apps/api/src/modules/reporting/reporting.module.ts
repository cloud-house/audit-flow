import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportEntity } from './infrastructure/report.entity';
import { OnAuditFinishedHandler } from './application/on-audit-finished.handler';
import { ReportController } from './api/report.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReportEntity])],
  controllers: [ReportController],
  providers: [OnAuditFinishedHandler],
})
export class ReportingModule {}
