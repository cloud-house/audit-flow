import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AuditCategory } from '@auditflow/types';
import { SeoChecker } from '../application/checkers/seo-checker';
import { PerformanceChecker } from '../application/checkers/performance-checker';
import { AuditCheckerInterface } from '../domain/audit-checker.interface';
import { AuditNotFoundException } from '../domain/exceptions/audit.exceptions';
import {
  AUDIT_REPOSITORY,
  AuditRepositoryInterface,
} from '../domain/repositories/audit.repository.interface';
import { AuditGateway } from '../api/audit.gateway';

interface AuditJobData {
  auditId: string;
  projectUrl: string;
  categories: AuditCategory[];
}

@Processor('audits')
export class AuditQueueConsumer extends WorkerHost {
  private readonly logger = new Logger(AuditQueueConsumer.name);

  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepo: AuditRepositoryInterface,
    private readonly seoChecker: SeoChecker,
    private readonly performanceChecker: PerformanceChecker,
    private readonly gateway: AuditGateway,
  ) {
    super();
  }

  async process(job: Job<AuditJobData>): Promise<void> {
    const { auditId, projectUrl, categories } = job.data;
    this.logger.log(`Processing audit ${auditId} for ${projectUrl}`);

    const audit = await this.auditRepo.findById(auditId);
    if (!audit) throw new AuditNotFoundException(auditId);

    audit.start();
    await this.auditRepo.save(audit);
    this.gateway.emitStatusChange(auditId, 'RUNNING');

    const checkers = this.resolveCheckers(categories);
    let completed = 0;

    for (const checker of checkers) {
      try {
        this.logger.debug(`Running ${checker.category} checker on ${projectUrl}`);
        const results = await checker.run(projectUrl);
        audit.addCheckResults(checker.category, results);
        await this.auditRepo.save(audit);

        completed++;
        const percent = Math.round((completed / checkers.length) * 100);
        this.gateway.emitProgress(auditId, percent, projectUrl);
        await job.updateProgress(percent);
      } catch (err) {
        this.logger.error(`Checker ${checker.category} failed: ${(err as Error).message}`);
        // Non-fatal: continue with remaining checkers
      }
    }

    try {
      audit.complete();
    } catch (err) {
      // Incomplete if some checkers threw — mark as failed
      audit.fail((err as Error).message);
    }

    await this.auditRepo.save(audit);
    this.gateway.emitStatusChange(auditId, audit.status);
    this.logger.log(`Audit ${auditId} finished with status ${audit.status}`);
  }

  private resolveCheckers(categories: AuditCategory[]): AuditCheckerInterface[] {
    const map: Record<AuditCategory, AuditCheckerInterface> = {
      SEO: this.seoChecker,
      PERFORMANCE: this.performanceChecker,
      ACCESSIBILITY: this.seoChecker, // Phase 3: replace with AccessibilityChecker
    };
    return categories.map((cat) => map[cat]);
  }
}
