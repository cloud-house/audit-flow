export class AuditStartedEvent {
  readonly occurredAt = new Date();

  constructor(
    readonly auditId: string,
    readonly projectId: string,
  ) {}
}
