import { useCallback, useEffect, useState } from 'react';
import { ProjectWithLastAudit } from '@auditflow/types';
import { IProjectRepository } from '../domain/project.repository';
import { projectRepository } from '../infrastructure/project.repository';

export function useProjectList(
  search: string,
  repo: IProjectRepository = projectRepository,
) {
  const [projects, setProjects] = useState<ProjectWithLastAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    repo
      .list({ search })
      .then((r) => setProjects(r.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, repo]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteProject = async (id: string): Promise<void> => {
    await repo.remove(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const createProject = async (data: { name: string; url: string }): Promise<void> => {
    await repo.create(data);
    load();
  };

  return { projects, loading, error, reload: load, deleteProject, createProject };
}
