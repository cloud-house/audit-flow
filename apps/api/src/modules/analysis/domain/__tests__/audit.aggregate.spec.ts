import { Audit } from '../audit.aggregate';
import { AuditFinishedEvent } from '../events/audit-finished.event';
import { AuditStartedEvent } from '../events/audit-started.event';
import {
  AuditAlreadyStartedException,
  AuditIncompleteException,
  AuditNotRunningException,
  InvalidUrlException,
} from '../exceptions/audit.exceptions';
import { CheckResult } from '../value-objects/check-result.vo';

describe('Audit Aggregate', () => {
  const validParams = {
    projectId: 'project-1',
    url: 'https://example.com',
    categories: ['SEO' as const],
  };

  describe('create()', () => {
    it('creates audit in PENDING status', () => {
      const audit = Audit.create(validParams);
      expect(audit.status).toBe('PENDING');
      expect(audit.checkResults).toHaveLength(0);
      expect(audit.domainEvents).toHaveLength(0);
    });

    it('throws InvalidUrlException for malformed URL', () => {
      expect(() =>
        Audit.create({ ...validParams, url: 'not-a-url' }),
      ).toThrow(InvalidUrlException);
    });

    it('throws InvalidUrlException for non-http protocol', () => {
      expect(() =>
        Audit.create({ ...validParams, url: 'ftp://example.com' }),
      ).toThrow(InvalidUrlException);
    });
  });

  describe('start()', () => {
    it('transitions to RUNNING and emits AuditStartedEvent', () => {
      const audit = Audit.create(validParams);
      audit.start();
      expect(audit.status).toBe('RUNNING');
      expect(audit.startedAt).toBeInstanceOf(Date);
      expect(audit.domainEvents[0]).toBeInstanceOf(AuditStartedEvent);
    });

    it('throws if already started', () => {
      const audit = Audit.create(validParams);
      audit.start();
      expect(() => audit.start()).toThrow(AuditAlreadyStartedException);
    });
  });

  describe('addCheckResults()', () => {
    it('stores results and computes score', () => {
      const audit = Audit.create(validParams);
      audit.start();
      const results = [
        new CheckResult('seo.missing-title', 'SEO', 'CRITICAL', 'Missing title', 'https://example.com'),
        new CheckResult('seo.missing-alt', 'SEO', 'WARNING', 'Missing alt', 'https://example.com/img'),
      ];
      audit.addCheckResults('SEO', results);

      expect(audit.checkResults).toHaveLength(2);
      // Penalty: 10 (CRITICAL) + 3 (WARNING) = 13 → score = 87
      expect(audit.scores.get('SEO')?.toNumber()).toBe(87);
    });

    it('gives perfect score when no issues found', () => {
      const audit = Audit.create(validParams);
      audit.start();
      audit.addCheckResults('SEO', []);
      expect(audit.scores.get('SEO')?.toNumber()).toBe(100);
    });

    it('throws if audit is not RUNNING', () => {
      const audit = Audit.create(validParams);
      expect(() =>
        audit.addCheckResults('SEO', []),
      ).toThrow(AuditNotRunningException);
    });
  });

  describe('complete()', () => {
    it('transitions to COMPLETED and emits AuditFinishedEvent', () => {
      const audit = Audit.create(validParams);
      audit.start();
      audit.addCheckResults('SEO', []);
      audit.complete();

      expect(audit.status).toBe('COMPLETED');
      expect(audit.completedAt).toBeInstanceOf(Date);
      const event = audit.domainEvents.find((e) => e instanceof AuditFinishedEvent);
      expect(event).toBeDefined();
    });

    it('throws AuditIncompleteException when categories have no results', () => {
      const audit = Audit.create({ ...validParams, categories: ['SEO', 'PERFORMANCE'] });
      audit.start();
      audit.addCheckResults('SEO', []);
      // PERFORMANCE results never added
      expect(() => audit.complete()).toThrow(AuditIncompleteException);
    });

    it('throws if not RUNNING', () => {
      const audit = Audit.create(validParams);
      expect(() => audit.complete()).toThrow(AuditNotRunningException);
    });
  });

  describe('fail()', () => {
    it('transitions to FAILED', () => {
      const audit = Audit.create(validParams);
      audit.start();
      audit.fail('Crawler timeout');
      expect(audit.status).toBe('FAILED');
    });
  });

  describe('score clamping', () => {
    it('never goes below 0', () => {
      const audit = Audit.create(validParams);
      audit.start();
      // 11 CRITICAL issues → penalty 110 → clamped to 0
      const manyErrors = Array.from({ length: 11 }, (_, i) =>
        new CheckResult(`rule.${i}`, 'SEO', 'CRITICAL', 'Error', 'https://example.com'),
      );
      audit.addCheckResults('SEO', manyErrors);
      expect(audit.scores.get('SEO')?.toNumber()).toBe(0);
    });
  });
});
