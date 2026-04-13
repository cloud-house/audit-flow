import { AuditSummary, ProjectDto, ProjectWithLastAudit } from '@auditflow/types';

export interface ProjectListQuery {
  search?: string;
  limit?: number;
  page?: number;
}

export interface ProjectListResult {
  data: ProjectWithLastAudit[];
  total: number;
}

export interface IProjectRepository {
  list(query: ProjectListQuery): Promise<ProjectListResult>;
  findById(id: string): Promise<ProjectDto>;
  findAudits(projectId: string): Promise<AuditSummary[]>;
  create(data: { name: string; url: string }): Promise<ProjectDto>;
  remove(id: string): Promise<void>;
}
