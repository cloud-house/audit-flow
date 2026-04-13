export type AuditStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type AuditCategory = 'SEO' | 'PERFORMANCE' | 'ACCESSIBILITY';
export type CheckSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AuditSummary {
  auditId: string;
  projectId: string;
  status: AuditStatus;
  scores: Partial<Record<AuditCategory, number>>;
  categories: AuditCategory[];
  checksCount: { CRITICAL: number; WARNING: number; INFO: number };
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CheckResultDto {
  id: string;
  ruleId: string;
  category: AuditCategory;
  severity: CheckSeverity;
  message: string;
  affectedUrl: string;
  details?: Record<string, unknown>;
}

export interface AuditProgressEvent {
  auditId: string;
  percent: number;
  currentUrl: string;
}

export interface AuditStatusEvent {
  auditId: string;
  status: AuditStatus;
}
