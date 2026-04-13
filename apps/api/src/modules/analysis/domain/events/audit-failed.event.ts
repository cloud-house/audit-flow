export class AuditFailedEvent {
  readonly occurredAt = new Date();

  constructor(
    readonly auditId: string,
    readonly reason: string,
  ) {}
}
