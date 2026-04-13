export class AuditFinishedEvent {
  readonly occurredAt = new Date();

  constructor(
    readonly auditId: string,
    readonly projectId: string,
    readonly scores: Record<string, number>,
  ) {}
}
