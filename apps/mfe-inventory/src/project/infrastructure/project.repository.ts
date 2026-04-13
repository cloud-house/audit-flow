import { AuditSummary, ProjectDto, ProjectWithLastAudit } from '@auditflow/types';
import {
  IProjectRepository,
  ProjectListQuery,
  ProjectListResult,
} from '../domain/project.repository';
import { apiFetch } from '../../shared/http';

export class ProjectHttpRepository implements IProjectRepository {
  async list({ search, limit = 50, page = 1 }: ProjectListQuery = {}): Promise<ProjectListResult> {
    const qs = new URLSearchParams({ limit: String(limit), page: String(page) });
    if (search) qs.set('search', search);
    const r = await apiFetch<{ data: ProjectWithLastAudit[]; meta: { total: number } }>(
      `/projects?${qs}`,
    );
    return { data: r.data, total: r.meta.total };
  }

  findById(id: string): Promise<ProjectDto> {
    return apiFetch<ProjectDto>(`/projects/${id}`);
  }

  findAudits(projectId: string): Promise<AuditSummary[]> {
    return apiFetch<AuditSummary[]>(`/projects/${projectId}/audits`);
  }

  create(data: { name: string; url: string }): Promise<ProjectDto> {
    return apiFetch<ProjectDto>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async remove(id: string): Promise<void> {
    await apiFetch<void>(`/projects/${id}`, { method: 'DELETE' });
  }
}

export const projectRepository = new ProjectHttpRepository();
