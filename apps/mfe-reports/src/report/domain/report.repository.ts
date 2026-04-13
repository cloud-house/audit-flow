import { AuditSummary, CheckResultDto } from '@auditflow/types';

export interface ReportMeta {
  id: string;
  auditId: string;
  generatedAt: string | null;
  pdfAvailable: boolean;
}

export interface ReportData {
  audit: AuditSummary;
  report: ReportMeta | null;
  checks: CheckResultDto[];
}

export interface IReportRepository {
  load(auditId: string): Promise<ReportData>;
  downloadPdf(auditId: string): Promise<Blob>;
}
