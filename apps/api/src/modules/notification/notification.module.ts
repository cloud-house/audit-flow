import { Module } from '@nestjs/common';
import { OnAuditFinishedNotificationHandler } from './application/on-audit-finished-notification.handler';

@Module({
  providers: [OnAuditFinishedNotificationHandler],
})
export class NotificationModule {}
