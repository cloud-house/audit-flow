import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditCategory, CheckSeverity } from '@auditflow/types';
import { AuditEntity } from './audit.entity';

@Entity('audit_checks')
export class AuditCheckEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AuditEntity, (audit) => audit.checks, { onDelete: 'CASCADE' })
  audit!: AuditEntity;

  @Column({ name: 'audit_id' })
  auditId!: string;

  @Column({ name: 'rule_id', length: 64 })
  ruleId!: string;

  @Column({ type: 'enum', enum: ['SEO', 'PERFORMANCE', 'ACCESSIBILITY'] })
  category!: AuditCategory;

  @Column({ type: 'enum', enum: ['CRITICAL', 'WARNING', 'INFO'] })
  severity!: CheckSeverity;

  @Column('text')
  message!: string;

  @Column({ name: 'affected_url', length: 2048 })
  affectedUrl!: string;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
