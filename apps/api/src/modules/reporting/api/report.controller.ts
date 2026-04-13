import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import * as fs from 'fs';
import { ReportEntity } from '../infrastructure/report.entity';

@Controller('reports')
export class ReportController {
  constructor(
    @InjectRepository(ReportEntity)
    private readonly reports: Repository<ReportEntity>,
  ) {}

  @Get(':auditId')
  async findOne(@Param('auditId') auditId: string) {
    const report = await this.reports.findOneBy({ auditId });
    if (!report) throw new NotFoundException(`Report for audit ${auditId} not found`);
    return {
      id: report.id,
      auditId: report.auditId,
      generatedAt: report.generatedAt?.toISOString() ?? null,
      pdfAvailable: !!report.pdfPath,
    };
  }

  @Get(':auditId/pdf')
  async downloadPdf(@Param('auditId') auditId: string, @Res() res: Response) {
    const report = await this.reports.findOneBy({ auditId });

    if (!report) {
      throw new NotFoundException(`Report for audit ${auditId} not found`);
    }

    if (!report.pdfPath || !fs.existsSync(report.pdfPath)) {
      return res.status(HttpStatus.ACCEPTED).json({ message: 'Report is being generated, try again shortly' });
    }

    const date = report.generatedAt
      ? report.generatedAt.toISOString().slice(0, 10)
      : 'report';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="audit-report-${date}.pdf"`);
    fs.createReadStream(report.pdfPath).pipe(res);
  }
}
