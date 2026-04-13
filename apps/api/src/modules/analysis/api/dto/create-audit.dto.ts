import { IsArray, IsEnum, IsUUID, ArrayMinSize } from 'class-validator';
import { AuditCategory } from '@auditflow/types';

export class CreateAuditDto {
  @IsUUID()
  projectId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(['SEO', 'PERFORMANCE', 'ACCESSIBILITY'], { each: true })
  categories!: AuditCategory[];
}
