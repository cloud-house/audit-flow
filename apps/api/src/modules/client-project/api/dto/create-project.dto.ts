import { IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
