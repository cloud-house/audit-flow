import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditFinishedEvent } from '../../analysis/domain/events/audit-finished.event';

@Injectable()
export class OnAuditFinishedNotificationHandler {
  private readonly logger = new Logger(OnAuditFinishedNotificationHandler.name);

  @OnEvent('audit.finished', { async: true })
  async handle(event: AuditFinishedEvent): Promise<void> {
    // Phase 2: replace with real SMTP/Slack integration
    this.logger.log(
      `[Notification] Audit ${event.auditId} finished for project ${event.projectId}. Scores: ${JSON.stringify(event.scores)}`,
    );
  }
}
