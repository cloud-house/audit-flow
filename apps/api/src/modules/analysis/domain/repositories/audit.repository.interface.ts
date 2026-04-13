import { Audit } from '../audit.aggregate';

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');

export interface AuditRepositoryInterface {
  save(audit: Audit): Promise<void>;
  findById(id: string): Promise<Audit | null>;
  findByProjectId(projectId: string, limit?: number): Promise<Audit[]>;
}
