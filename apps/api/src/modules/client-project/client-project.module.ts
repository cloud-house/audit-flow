import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from './infrastructure/client.entity';
import { ProjectEntity } from './infrastructure/project.entity';
import { ClientController } from './api/client.controller';
import { ProjectController } from './api/project.controller';
import { AnalysisModule } from '../analysis/analysis.module';
import { AuditEntity } from '../analysis/infrastructure/audit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientEntity, ProjectEntity, AuditEntity]),
    AnalysisModule,
  ],
  controllers: [ClientController, ProjectController],
})
export class ClientProjectModule {}
