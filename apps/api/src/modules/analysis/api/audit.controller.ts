import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditCategory, CheckSeverity } from '@auditflow/types';
import { StartAuditUseCase } from '../application/start-audit.use-case';
import { GetAuditStatusUseCase } from '../application/get-audit-status.use-case';
import { AuditNotFoundException, InvalidUrlException } from '../domain/exceptions/audit.exceptions';
import { CreateAuditDto } from './dto/create-audit.dto';
import { ProjectEntity } from '../../client-project/infrastructure/project.entity';

@Controller('audits')
export class AuditController {
  constructor(
    private readonly startAudit: StartAuditUseCase,
    private readonly getAuditStatus: GetAuditStatusUseCase,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() dto: CreateAuditDto) {
    const project = await this.projectRepo.findOneBy({ id: dto.projectId });
    if (!project) throw new NotFoundException(`Project ${dto.projectId} not found`);

    try {
      const auditId = await this.startAudit.execute({
        projectId: dto.projectId,
        url: project.url,
        categories: dto.categories,
      });
      return { auditId, status: 'PENDING' };
    } catch (err) {
      if (err instanceof InvalidUrlException) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const audit = await this.getAuditStatus.execute(id);
      const scoresRecord: Record<string, number> = {};
      audit.scores.forEach((score, cat) => {
        scoresRecord[cat] = score.toNumber();
      });

      const checks = audit.checkResults;
      return {
        auditId: audit.id,
        projectId: audit.projectId,
        status: audit.status,
        categories: audit.requestedCategories,
        scores: scoresRecord,
        checksCount: {
          CRITICAL: checks.filter((c) => c.severity === 'CRITICAL').length,
          WARNING: checks.filter((c) => c.severity === 'WARNING').length,
          INFO: checks.filter((c) => c.severity === 'INFO').length,
        },
        startedAt: audit.startedAt?.toISOString() ?? null,
        completedAt: audit.completedAt?.toISOString() ?? null,
        createdAt: audit.createdAt.toISOString(),
      };
    } catch (err) {
      if (err instanceof AuditNotFoundException) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Get(':id/checks')
  async findChecks(
    @Param('id') id: string,
    @Query('category') category?: AuditCategory,
    @Query('severity') severity?: CheckSeverity,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    try {
      const audit = await this.getAuditStatus.execute(id);
      let checks = audit.checkResults;

      if (category) checks = checks.filter((c) => c.category === category);
      if (severity) checks = checks.filter((c) => c.severity === severity);

      const total = checks.length;
      const offset = (page - 1) * limit;
      const data = checks.slice(offset, offset + limit);

      return {
        data: data.map((c) => ({
          ruleId: c.ruleId,
          category: c.category,
          severity: c.severity,
          message: c.message,
          affectedUrl: c.affectedUrl,
          details: c.details,
        })),
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      if (err instanceof AuditNotFoundException) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
