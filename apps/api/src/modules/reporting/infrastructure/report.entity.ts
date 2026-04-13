import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditEntity } from '../../analysis/infrastructure/audit.entity';

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'audit_id', unique: true })
  auditId!: string;

  @OneToOne(() => AuditEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_id' })
  audit!: AuditEntity;

  @Column({ name: 'pdf_path', type: 'varchar', length: 1024, nullable: true })
  pdfPath!: string | null;

  @Column({ name: 'generated_at', type: 'timestamptz', nullable: true })
  generatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
