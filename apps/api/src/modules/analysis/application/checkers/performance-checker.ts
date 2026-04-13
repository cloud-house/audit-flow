import { Injectable } from '@nestjs/common';
import type { CheerioAPI } from 'cheerio';
import { AuditCheckerInterface } from '../../domain/audit-checker.interface';
import { CheckResult } from '../../domain/value-objects/check-result.vo';

@Injectable()
export class PerformanceChecker implements AuditCheckerInterface {
  readonly category = 'PERFORMANCE' as const;

  async run(url: string): Promise<CheckResult[]> {
    const { CrawlerFactory } = await import(
      '../../../../infrastructure/crawler/crawler.factory'
    );
    const crawler = await CrawlerFactory.create(url);
    const $ = await crawler.fetch(url);
    const rawHtml = $.html();

    return [
      ...this.checkViewport($, url),
      ...this.checkHttps(url),
      ...this.checkPageSize(rawHtml, url),
      ...this.checkInlineStyles($, url),
      ...this.checkRenderBlockingScripts($, url),
    ];
  }

  private checkViewport($: CheerioAPI, url: string): CheckResult[] {
    const viewport = $('meta[name="viewport"]').attr('content');
    if (!viewport) {
      return [new CheckResult('perf.missing-viewport', 'PERFORMANCE', 'CRITICAL', 'Missing <meta name="viewport"> — page is not mobile-friendly', url)];
    }
    return [];
  }

  private checkHttps(url: string): CheckResult[] {
    if (!url.startsWith('https://')) {
      return [new CheckResult('perf.no-https', 'PERFORMANCE', 'CRITICAL', 'Page is served over HTTP — should use HTTPS', url)];
    }
    return [];
  }

  private checkPageSize(html: string, url: string): CheckResult[] {
    const sizeKb = Buffer.byteLength(html, 'utf8') / 1024;
    if (sizeKb > 3072) {
      return [new CheckResult('perf.large-page', 'PERFORMANCE', 'CRITICAL', `HTML response too large: ${Math.round(sizeKb)} KB (max 3072 KB)`, url)];
    }
    if (sizeKb > 1000) {
      return [new CheckResult('perf.large-page-warning', 'PERFORMANCE', 'WARNING', `HTML response large: ${Math.round(sizeKb)} KB (recommended < 1000 KB)`, url)];
    }
    return [];
  }

  private checkInlineStyles($: CheerioAPI, url: string): CheckResult[] {
    const count = $('[style]').length;
    if (count > 20) {
      return [new CheckResult('perf.excessive-inline-styles', 'PERFORMANCE', 'WARNING', `${count} elements use inline styles — prefer external CSS`, url)];
    }
    return [];
  }

  private checkRenderBlockingScripts($: CheerioAPI, url: string): CheckResult[] {
    const blocking: string[] = [];
    $('head script[src]').each((_i, el) => {
      const $el = $(el);
      const hasDefer = $el.attr('defer') !== undefined;
      const hasAsync = $el.attr('async') !== undefined;
      if (!hasDefer && !hasAsync) {
        blocking.push($el.attr('src') ?? 'unknown');
      }
    });

    if (blocking.length > 0) {
      return [new CheckResult(
        'perf.render-blocking-scripts',
        'PERFORMANCE',
        'WARNING',
        `${blocking.length} render-blocking script(s) in <head> (missing defer/async)`,
        url,
        { scripts: blocking.slice(0, 5) },
      )];
    }
    return [];
  }
}
