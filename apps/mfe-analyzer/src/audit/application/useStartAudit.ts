import { useState } from 'react';
import { AuditCategory } from '@auditflow/types';
import { IAuditRepository } from '../domain/audit.repository';
import { auditRepository } from '../infrastructure/audit.repository';

export function useStartAudit(repo: IAuditRepository = auditRepository) {
  const [auditId, setAuditId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const start = async (projectId: string, categories: AuditCategory[]): Promise<void> => {
    setError('');
    setStarting(true);
    try {
      const result = await repo.start({ projectId, categories });
      setAuditId(result.auditId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setAuditId(null);
    setError('');
  };

  return { auditId, starting, error, start, reset };
}
