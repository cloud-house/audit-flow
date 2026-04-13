import { AuditCategory } from '@auditflow/types';

export interface StartAuditCommand {
  projectId: string;
  categories: AuditCategory[];
}

export interface StartAuditResult {
  auditId: string;
}

export interface IAuditRepository {
  start(command: StartAuditCommand): Promise<StartAuditResult>;
}
