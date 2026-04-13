import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../infrastructure/project.entity';
import { AuditEntity } from '../../analysis/infrastructure/audit.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  AUDIT_REPOSITORY,
  AuditRepositoryInterface,
} from '../../analysis/domain/repositories/audit.repository.interface';

@Controller('projects')
export class ProjectController {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(AuditEntity)
    private readonly audits: Repository<AuditEntity>,
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepo: AuditRepositoryInterface,
  ) {}

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    const qb = this.projects.createQueryBuilder('p').leftJoinAndSelect('p.client', 'c');
    if (clientId) qb.andWhere('p.clientId = :clientId', { clientId });
    if (search) qb.andWhere('p.name ILIKE :s', { s: `%${search}%` });
    qb.skip((page - 1) * limit).take(limit).orderBy('p.createdAt', 'DESC');
    const [entities, total] = await qb.getManyAndCount();

    // Batch-fetch latest completed audit per project in one query
    const projectIds = entities.map((p) => p.id);
    const lastAudits = projectIds.length
      ? await this.audits
          .createQueryBuilder('a')
          .distinctOn(['a.projectId'])
          .where('a.projectId IN (:...ids)', { ids: projectIds })
          .andWhere("a.status = 'COMPLETED'")
          .orderBy('a.projectId')
          .addOrderBy('a.completedAt', 'DESC')
          .getMany()
      : [];

    const lastAuditMap = new Map(lastAudits.map((a) => [a.projectId, a]));

    const data = entities.map((p) => {
      const la = lastAuditMap.get(p.id);
      return {
        ...p,
        lastAudit: la
          ? {
              auditId: la.id,
              scoreSeo: la.scoreSeo,
              scorePerf: la.scorePerf,
              completedAt: la.completedAt?.toISOString() ?? null,
            }
          : undefined,
      };
    });

    return {
      data,
      meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }

  @Post()
  async create(@Body() dto: CreateProjectDto) {
    const project = this.projects.create(dto);
    return this.projects.save(project);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const project = await this.projects.findOne({ where: { id }, relations: ['client'] });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  @Get(':id/audits')
  async findAudits(@Param('id') id: string) {
    const project = await this.projects.findOneBy({ id });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    const audits = await this.auditRepo.findByProjectId(id);
    return audits.map((a) => {
      const scores: Record<string, number> = {};
      a.scores.forEach((s, cat) => { scores[cat] = s.toNumber(); });
      return {
        auditId: a.id,
        projectId: a.projectId,
        status: a.status,
        categories: a.requestedCategories,
        scores,
        checksCount: {
          CRITICAL: a.checkResults.filter((c) => c.severity === 'CRITICAL').length,
          WARNING:  a.checkResults.filter((c) => c.severity === 'WARNING').length,
          INFO:     a.checkResults.filter((c) => c.severity === 'INFO').length,
        },
        startedAt: a.startedAt?.toISOString() ?? null,
        completedAt: a.completedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      };
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateProjectDto>) {
    const project = await this.projects.findOneBy({ id });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    Object.assign(project, dto);
    return this.projects.save(project);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    const project = await this.projects.findOneBy({ id });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    await this.projects.remove(project);
  }
}
