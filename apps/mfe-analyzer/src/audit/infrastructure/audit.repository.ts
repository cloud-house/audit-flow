import { IAuditRepository, StartAuditCommand, StartAuditResult } from '../domain/audit.repository';
import { apiFetch } from '../../shared/http';

export class AuditHttpRepository implements IAuditRepository {
  start(command: StartAuditCommand): Promise<StartAuditResult> {
    return apiFetch<StartAuditResult>('/audits', {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }
}

export const auditRepository = new AuditHttpRepository();
