import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AuditFinishedEvent } from '../../analysis/domain/events/audit-finished.event';
import { ReportEntity } from '../infrastructure/report.entity';

@Injectable()
export class OnAuditFinishedHandler {
  private readonly logger = new Logger(OnAuditFinishedHandler.name);

  constructor(
    @InjectRepository(ReportEntity)
    private readonly reports: Repository<ReportEntity>,
    private readonly config: ConfigService,
  ) {}

  @OnEvent('audit.finished', { async: true })
  async handle(event: AuditFinishedEvent): Promise<void> {
    this.logger.log(`Generating report for audit ${event.auditId}`);

    try {
      const pdfPath = await this.generatePdf(event.auditId, event.scores);

      const report = this.reports.create({
        auditId: event.auditId,
        pdfPath,
        generatedAt: new Date(),
      });
      await this.reports.save(report);

      this.logger.log(`Report saved at ${pdfPath}`);
    } catch (err) {
      this.logger.error(`Failed to generate report for audit ${event.auditId}: ${(err as Error).message}`);
    }
  }

  private async generatePdf(auditId: string, scores: Record<string, number>): Promise<string> {
    const outputDir = this.config.get<string>('PDF_OUTPUT_DIR', './pdf-output');
    await fs.mkdir(outputDir, { recursive: true });

    const html = this.buildReportHtml(auditId, scores);
    const filename = `report-${auditId}.pdf`;
    const outputPath = path.join(outputDir, filename);

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
    } finally {
      await browser.close();
    }

    return outputPath;
  }

  private buildReportHtml(auditId: string, scores: Record<string, number>): string {
    const scoreRows = Object.entries(scores)
      .map(([cat, score]) => `<tr><td>${cat}</td><td><strong>${score}/100</strong></td></tr>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a1a2e; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>AuditFlow — Raport Audytu</h1>
  <p>ID audytu: <code>${auditId}</code></p>
  <p>Data generowania: ${new Date().toLocaleDateString('pl-PL')}</p>
  <h2>Wyniki</h2>
  <table>
    <tr><th>Kategoria</th><th>Score</th></tr>
    ${scoreRows}
  </table>
</body>
</html>`;
  }
}
