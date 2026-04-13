import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditCategory } from '@auditflow/types';
import { Audit } from '../domain/audit.aggregate';
import {
  AUDIT_REPOSITORY,
  AuditRepositoryInterface,
} from '../domain/repositories/audit.repository.interface';

export interface StartAuditCommand {
  projectId: string;
  url: string;
  categories: AuditCategory[];
}

@Injectable()
export class StartAuditUseCase {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepo: AuditRepositoryInterface,
    @InjectQueue('audits')
    private readonly auditQueue: Queue,
  ) {}

  async execute(command: StartAuditCommand): Promise<string> {
    const audit = Audit.create({
      projectId: command.projectId,
      url: command.url,
      categories: command.categories,
    });

    await this.auditRepo.save(audit);

    await this.auditQueue.add(
      'run-audit',
      {
        auditId: audit.id,
        projectUrl: audit.url.toString(),
        categories: command.categories,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );

    return audit.id;
  }
}
