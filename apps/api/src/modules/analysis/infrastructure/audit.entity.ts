import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { AuditStatus, AuditCategory } from '@auditflow/types';
import { AuditCheckEntity } from './audit-check.entity';

@Entity('audits')
export class AuditEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'project_id' })
  projectId!: string;

  @Column()
  url!: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  })
  status!: AuditStatus;

  @Column('text', { array: true, default: '{}' })
  categories!: AuditCategory[];

  @Column({ name: 'score_seo', type: 'smallint', nullable: true })
  scoreSeo!: number | null;

  @Column({ name: 'score_perf', type: 'smallint', nullable: true })
  scorePerf!: number | null;

  @Column({ name: 'score_a11y', type: 'smallint', nullable: true })
  scoreA11y!: number | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => AuditCheckEntity, (check) => check.audit, { cascade: true })
  checks!: AuditCheckEntity[];
}
