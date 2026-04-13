/**
 * TypeScript declarations for Module Federation remotes.
 * Without these, TS doesn't know what each remote exports.
 */
declare module 'mfeInventory/ProjectListPage' {
  import { ComponentType } from 'react';
  const ProjectListPage: ComponentType<Record<string, never>>;
  export default ProjectListPage;
}

declare module 'mfeInventory/ProjectDetailPage' {
  import { ComponentType } from 'react';
  const ProjectDetailPage: ComponentType<Record<string, never>>;
  export default ProjectDetailPage;
}

declare module 'mfeAnalyzer/AuditRunPage' {
  import { ComponentType } from 'react';
  const AuditRunPage: ComponentType<Record<string, never>>;
  export default AuditRunPage;
}

declare module 'mfeReports/ReportPage' {
  import { ComponentType } from 'react';
  const ReportPage: ComponentType<Record<string, never>>;
  export default ReportPage;
}
