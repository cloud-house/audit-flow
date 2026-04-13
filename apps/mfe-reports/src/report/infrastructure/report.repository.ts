import { AuditSummary, CheckResultDto } from '@auditflow/types';
import { IReportRepository, ReportData, ReportMeta } from '../domain/report.repository';
import { apiFetch, fetchBlob } from '../../shared/http';

interface PaginatedChecks {
  data: CheckResultDto[];
  meta: { total: number };
}

export class ReportHttpRepository implements IReportRepository {
  async load(auditId: string): Promise<ReportData> {
    const [audit, checks, report] = await Promise.all([
      apiFetch<AuditSummary>(`/audits/${auditId}`),
      apiFetch<PaginatedChecks>(`/audits/${auditId}/checks?limit=200`),
      apiFetch<ReportMeta>(`/reports/${auditId}`).catch(() => null),
    ]);
    return { audit, checks: checks.data, report };
  }

  downloadPdf(auditId: string): Promise<Blob> {
    return fetchBlob(`/reports/${auditId}/pdf`);
  }
}

export const reportRepository = new ReportHttpRepository();
