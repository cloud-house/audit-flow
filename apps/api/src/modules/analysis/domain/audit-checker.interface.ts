import { AuditCategory } from '@auditflow/types';
import { CheckResult } from './value-objects/check-result.vo';

export interface AuditCheckerInterface {
  readonly category: AuditCategory;
  run(url: string): Promise<CheckResult[]>;
}
