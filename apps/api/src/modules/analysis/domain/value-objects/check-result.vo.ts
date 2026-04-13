import { AuditCategory, CheckSeverity } from '@auditflow/types';

export class CheckResult {
  constructor(
    readonly ruleId: string,
    readonly category: AuditCategory,
    readonly severity: CheckSeverity,
    readonly message: string,
    readonly affectedUrl: string,
    readonly details?: Record<string, unknown>,
  ) {}

  isPassing(): boolean {
    return this.severity === 'INFO';
  }

  isCritical(): boolean {
    return this.severity === 'CRITICAL';
  }
}
