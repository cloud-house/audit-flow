import { useEffect, useState } from 'react';
import { AuditSummary, ProjectDto } from '@auditflow/types';
import { IProjectRepository } from '../domain/project.repository';
import { projectRepository } from '../infrastructure/project.repository';

export function useProjectDetail(
  id: string | undefined,
  repo: IProjectRepository = projectRepository,
) {
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([repo.findById(id), repo.findAudits(id)])
      .then(([proj, auds]) => {
        setProject(proj);
        setAudits(auds);
      })
      .finally(() => setLoading(false));
  }, [id, repo]);

  return { project, audits, loading };
}
