import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Audit } from '../domain/audit.aggregate';
import { AuditFinishedEvent } from '../domain/events/audit-finished.event';
import { AuditStartedEvent } from '../domain/events/audit-started.event';
import { AuditFailedEvent } from '../domain/events/audit-failed.event';
import { AuditRepositoryInterface } from '../domain/repositories/audit.repository.interface';
import { AuditEntity } from './audit.entity';
import { AuditMapper } from './audit.mapper';

/** Maps domain event class → EventEmitter2 channel name */
function eventName(event: unknown): string {
  if (event instanceof AuditStartedEvent) return 'audit.started';
  if (event instanceof AuditFinishedEvent) return 'audit.finished';
  if (event instanceof AuditFailedEvent) return 'audit.failed';
  return 'audit.unknown';
}

@Injectable()
export class AuditRepository implements AuditRepositoryInterface {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly orm: Repository<AuditEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async save(audit: Audit): Promise<void> {
    const entity = AuditMapper.toEntity(audit);

    // Upsert: delete old checks first to avoid duplicates on update
    await this.orm.manager.transaction(async (manager) => {
      await manager.delete('audit_checks', { auditId: audit.id });
      await manager.save(AuditEntity, entity);
    });

    // Publish domain events AFTER successful DB commit
    for (const event of audit.domainEvents) {
      await this.eventEmitter.emitAsync(eventName(event), event);
    }
    audit.clearDomainEvents();
  }

  async findById(id: string): Promise<Audit | null> {
    const entity = await this.orm.findOne({
      where: { id },
      relations: ['checks'],
    });
    return entity ? AuditMapper.toDomain(entity) : null;
  }

  async findByProjectId(projectId: string, limit = 30): Promise<Audit[]> {
    const entities = await this.orm.find({
      where: { projectId },
      relations: ['checks'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return entities.map(AuditMapper.toDomain);
  }
}
