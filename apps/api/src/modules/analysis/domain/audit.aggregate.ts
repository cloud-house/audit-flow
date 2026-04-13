import { AuditCategory, AuditStatus } from '@auditflow/types';
import { AuditFinishedEvent } from './events/audit-finished.event';
import { AuditStartedEvent } from './events/audit-started.event';
import { AuditFailedEvent } from './events/audit-failed.event';
import {
  AuditAlreadyStartedException,
  AuditIncompleteException,
  AuditNotRunningException,
} from './exceptions/audit.exceptions';
import { AuditScore } from './value-objects/audit-score.vo';
import { CheckResult } from './value-objects/check-result.vo';
import { Url } from './value-objects/url.vo';

type DomainEvent = AuditStartedEvent | AuditFinishedEvent | AuditFailedEvent;

export interface AuditProps {
  id: string;
  projectId: string;
  url: Url;
  requestedCategories: AuditCategory[];
  status: AuditStatus;
  checkResults: CheckResult[];
  scores: Map<AuditCategory, AuditScore>;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  domainEvents: DomainEvent[];
}

export class Audit {
  private readonly props: AuditProps;

  private constructor(props: AuditProps) {
    this.props = props;
  }

  // ── Factory ──────────────────────────────────────────────────────────────

  static create(params: {
    projectId: string;
    url: string;
    categories: AuditCategory[];
  }): Audit {
    return new Audit({
      id: crypto.randomUUID(),
      projectId: params.projectId,
      url: Url.create(params.url),
      requestedCategories: params.categories,
      status: 'PENDING',
      checkResults: [],
      scores: new Map(),
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      domainEvents: [],
    });
  }

  /** Restore from persistence — skips validation, trusts stored data */
  static reconstitute(props: Omit<AuditProps, 'domainEvents'>): Audit {
    return new Audit({ ...props, domainEvents: [] });
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get id(): string {
    return this.props.id;
  }

  get projectId(): string {
    return this.props.projectId;
  }

  get url(): Url {
    return this.props.url;
  }

  get status(): AuditStatus {
    return this.props.status;
  }

  get requestedCategories(): AuditCategory[] {
    return [...this.props.requestedCategories];
  }

  /** Returns a defensive copy — callers cannot mutate internal state */
  get scores(): Map<AuditCategory, AuditScore> {
    return new Map(this.props.scores);
  }

  get checkResults(): CheckResult[] {
    return [...this.props.checkResults];
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get domainEvents(): DomainEvent[] {
    return [...this.props.domainEvents];
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  start(): void {
    if (this.props.status !== 'PENDING') {
      throw new AuditAlreadyStartedException(this.props.id);
    }
    this.props.status = 'RUNNING';
    this.props.startedAt = new Date();
    this.recordEvent(new AuditStartedEvent(this.props.id, this.props.projectId));
  }

  addCheckResults(category: AuditCategory, results: CheckResult[]): void {
    if (this.props.status !== 'RUNNING') {
      throw new AuditNotRunningException(this.props.id);
    }
    this.props.checkResults.push(...results);
    this.props.scores.set(category, this.calculateScore(results));
  }

  complete(): void {
    if (this.props.status !== 'RUNNING') {
      throw new AuditNotRunningException(this.props.id);
    }

    const missingCategories = this.props.requestedCategories.filter(
      (cat) => !this.props.scores.has(cat),
    );

    if (missingCategories.length > 0) {
      throw new AuditIncompleteException(
        `Missing results for categories: ${missingCategories.join(', ')}`,
      );
    }

    this.props.status = 'COMPLETED';
    this.props.completedAt = new Date();

    const scoresRecord: Record<string, number> = {};
    this.props.scores.forEach((score, cat) => {
      scoresRecord[cat] = score.toNumber();
    });

    this.recordEvent(
      new AuditFinishedEvent(this.props.id, this.props.projectId, scoresRecord),
    );
  }

  fail(reason: string): void {
    this.props.status = 'FAILED';
    this.props.completedAt = new Date();
    this.recordEvent(new AuditFailedEvent(this.props.id, reason));
  }

  clearDomainEvents(): void {
    this.props.domainEvents.length = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Penalty-based scoring:
   *   CRITICAL = -10 pts, WARNING = -3 pts, INFO = 0 pts
   * Score is clamped to [0, 100].
   */
  private calculateScore(results: CheckResult[]): AuditScore {
    if (results.length === 0) return AuditScore.perfect();

    const weights: Record<string, number> = { CRITICAL: 10, WARNING: 3, INFO: 0 };
    const penalty = results.reduce((sum, r) => sum + (weights[r.severity] ?? 0), 0);
    return AuditScore.create(Math.max(0, 100 - penalty));
  }

  private recordEvent(event: DomainEvent): void {
    this.props.domainEvents.push(event);
  }
}
