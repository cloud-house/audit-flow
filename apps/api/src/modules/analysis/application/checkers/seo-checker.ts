import { Injectable } from '@nestjs/common';
import type { CheerioAPI } from 'cheerio';
import { AuditCheckerInterface } from '../../domain/audit-checker.interface';
import { CheckResult } from '../../domain/value-objects/check-result.vo';

@Injectable()
export class SeoChecker implements AuditCheckerInterface {
  readonly category = 'SEO' as const;

  async run(url: string): Promise<CheckResult[]> {
    const { CrawlerFactory } = await import(
      '../../../../infrastructure/crawler/crawler.factory'
    );
    const crawler = await CrawlerFactory.create(url);
    const $ = await crawler.fetch(url);

    return [
      ...this.checkTitle($, url),
      ...this.checkMetaDescription($, url),
      ...this.checkH1($, url),
      ...this.checkHeadingHierarchy($, url),
      ...this.checkImageAlts($, url),
      ...this.checkCanonical($, url),
    ];
  }

  private checkTitle($: CheerioAPI, url: string): CheckResult[] {
    const title = $('title').first().text().trim();

    if (!title) {
      return [new CheckResult('seo.missing-title', 'SEO', 'CRITICAL', 'Page is missing a <title> tag', url)];
    }
    if (title.length < 10) {
      return [new CheckResult('seo.title-too-short', 'SEO', 'WARNING', `Title too short (${title.length} chars, min 10)`, url)];
    }
    if (title.length > 60) {
      return [new CheckResult('seo.title-too-long', 'SEO', 'WARNING', `Title too long (${title.length} chars, max 60)`, url)];
    }
    return [];
  }

  private checkMetaDescription($: CheerioAPI, url: string): CheckResult[] {
    const desc = $('meta[name="description"]').attr('content')?.trim() ?? '';

    if (!desc) {
      return [new CheckResult('seo.missing-meta-description', 'SEO', 'WARNING', 'Page is missing <meta name="description">', url)];
    }
    if (desc.length < 50) {
      return [new CheckResult('seo.meta-description-too-short', 'SEO', 'WARNING', `Meta description too short (${desc.length} chars, min 50)`, url)];
    }
    if (desc.length > 160) {
      return [new CheckResult('seo.meta-description-too-long', 'SEO', 'WARNING', `Meta description too long (${desc.length} chars, max 160)`, url)];
    }
    return [];
  }

  private checkH1($: CheerioAPI, url: string): CheckResult[] {
    const h1Count = $('h1').length;

    if (h1Count === 0) {
      return [new CheckResult('seo.missing-h1', 'SEO', 'CRITICAL', 'Page has no <h1> tag', url)];
    }
    if (h1Count > 1) {
      return [new CheckResult('seo.multiple-h1', 'SEO', 'WARNING', `Page has ${h1Count} <h1> tags — should have exactly one`, url)];
    }
    return [];
  }

  private checkHeadingHierarchy($: CheerioAPI, url: string): CheckResult[] {
    const headings = $('h1,h2,h3,h4,h5,h6')
      .toArray()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((el) => parseInt((el as any).tagName.replace('h', ''), 10));

    for (let i = 1; i < headings.length; i++) {
      if (headings[i] - headings[i - 1] > 1) {
        return [new CheckResult(
          'seo.heading-skip',
          'SEO',
          'WARNING',
          `Heading hierarchy skips a level: h${headings[i - 1]} → h${headings[i]}`,
          url,
        )];
      }
    }
    return [];
  }

  private checkImageAlts($: CheerioAPI, url: string): CheckResult[] {
    const missing: string[] = [];
    $('img').each((_i, el) => {
      const alt = $(el).attr('alt');
      if (alt === undefined) {
        missing.push($(el).attr('src') ?? 'unknown');
      }
    });

    if (missing.length === 0) return [];
    return [new CheckResult(
      'seo.missing-alt',
      'SEO',
      'WARNING',
      `${missing.length} image(s) missing alt attribute`,
      url,
      { images: missing.slice(0, 10) },
    )];
  }

  private checkCanonical($: CheerioAPI, url: string): CheckResult[] {
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) {
      return [new CheckResult('seo.missing-canonical', 'SEO', 'INFO', 'No canonical link found', url)];
    }
    return [];
  }
}
