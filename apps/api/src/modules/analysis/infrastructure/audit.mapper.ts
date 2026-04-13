import { AuditCategory } from '@auditflow/types';
import { Audit } from '../domain/audit.aggregate';
import { AuditScore } from '../domain/value-objects/audit-score.vo';
import { CheckResult } from '../domain/value-objects/check-result.vo';
import { Url } from '../domain/value-objects/url.vo';
import { AuditCheckEntity } from './audit-check.entity';
import { AuditEntity } from './audit.entity';

export class AuditMapper {
  static toDomain(entity: AuditEntity): Audit {
    const scores = new Map<AuditCategory, AuditScore>();
    if (entity.scoreSeo !== null) scores.set('SEO', AuditScore.create(entity.scoreSeo));
    if (entity.scorePerf !== null) scores.set('PERFORMANCE', AuditScore.create(entity.scorePerf));
    if (entity.scoreA11y !== null) scores.set('ACCESSIBILITY', AuditScore.create(entity.scoreA11y));

    const checkResults = (entity.checks ?? []).map(
      (c) =>
        new CheckResult(
          c.ruleId,
          c.category,
          c.severity,
          c.message,
          c.affectedUrl,
          c.details ?? undefined,
        ),
    );

    return Audit.reconstitute({
      id: entity.id,
      projectId: entity.projectId,
      url: Url.reconstitute(entity.url),
      requestedCategories: entity.categories,
      status: entity.status,
      checkResults,
      scores,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      createdAt: entity.createdAt,
    });
  }

  static toEntity(audit: Audit): AuditEntity {
    const entity = new AuditEntity();
    entity.id = audit.id;
    entity.projectId = audit.projectId;
    entity.url = audit.url.toString();
    entity.status = audit.status;
    entity.categories = audit.requestedCategories;
    entity.scoreSeo = audit.scores.get('SEO')?.toNumber() ?? null;
    entity.scorePerf = audit.scores.get('PERFORMANCE')?.toNumber() ?? null;
    entity.scoreA11y = audit.scores.get('ACCESSIBILITY')?.toNumber() ?? null;
    entity.startedAt = audit.startedAt;
    entity.completedAt = audit.completedAt;

    entity.checks = audit.checkResults.map((cr) => {
      const check = new AuditCheckEntity();
      check.auditId = audit.id;
      check.ruleId = cr.ruleId;
      check.category = cr.category;
      check.severity = cr.severity;
      check.message = cr.message;
      check.affectedUrl = cr.affectedUrl;
      check.details = cr.details ?? null;
      return check;
    });

    return entity;
  }
}
