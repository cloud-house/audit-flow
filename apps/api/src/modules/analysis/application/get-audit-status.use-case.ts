import { Inject, Injectable } from '@nestjs/common';
import { Audit } from '../domain/audit.aggregate';
import { AuditNotFoundException } from '../domain/exceptions/audit.exceptions';
import {
  AUDIT_REPOSITORY,
  AuditRepositoryInterface,
} from '../domain/repositories/audit.repository.interface';

@Injectable()
export class GetAuditStatusUseCase {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepo: AuditRepositoryInterface,
  ) {}

  async execute(auditId: string): Promise<Audit> {
    const audit = await this.auditRepo.findById(auditId);
    if (!audit) throw new AuditNotFoundException(auditId);
    return audit;
  }
}
