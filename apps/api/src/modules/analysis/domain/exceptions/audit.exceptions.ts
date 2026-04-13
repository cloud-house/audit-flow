export class InvalidUrlException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlException';
  }
}

export class InvalidScoreException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScoreException';
  }
}

export class AuditAlreadyStartedException extends Error {
  constructor(auditId: string) {
    super(`Audit ${auditId} has already been started`);
    this.name = 'AuditAlreadyStartedException';
  }
}

export class AuditNotRunningException extends Error {
  constructor(auditId: string) {
    super(`Audit ${auditId} is not in RUNNING state`);
    this.name = 'AuditNotRunningException';
  }
}

export class AuditIncompleteException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditIncompleteException';
  }
}

export class AuditNotFoundException extends Error {
  constructor(auditId: string) {
    super(`Audit ${auditId} not found`);
    this.name = 'AuditNotFoundException';
  }
}
