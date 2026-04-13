import { useEffect, useState } from 'react';
import { AuditSummary, CheckResultDto } from '@auditflow/types';
import { IReportRepository, ReportMeta } from '../domain/report.repository';
import { reportRepository } from '../infrastructure/report.repository';

export function useReport(
  auditId: string | undefined,
  repo: IReportRepository = reportRepository,
) {
  const [audit, setAudit] = useState<AuditSummary | null>(null);
  const [report, setReport] = useState<ReportMeta | null>(null);
  const [checks, setChecks] = useState<CheckResultDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!auditId) return;
    setLoading(true);
    repo
      .load(auditId)
      .then(({ audit: a, report: r, checks: c }) => {
        setAudit(a);
        setReport(r);
        setChecks(c);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [auditId, repo]);

  const downloadPdf = async (): Promise<void> => {
    if (!auditId) return;
    setDownloading(true);
    try {
      const blob = await repo.downloadPdf(auditId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${auditId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return { audit, report, checks, loading, error, downloading, downloadPdf };
}
