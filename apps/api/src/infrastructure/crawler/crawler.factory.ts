import * as cheerio from 'cheerio';

export interface CrawlerAdapter {
  fetch(url: string): Promise<cheerio.CheerioAPI>;
}

export class CrawlerFactory {
  static async create(url: string): Promise<CrawlerAdapter> {
    let html: string;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AuditFlow-Crawler/1.0' },
        signal: AbortSignal.timeout(10_000),
      });
      html = await res.text();
    } catch {
      return new CheerioAdapter();
    }

    const isClientRendered =
      /<div[^>]+id=["'](root|app)["']/.test(html) ||
      html.includes('__NEXT_DATA__') ||
      html.includes('data-reactroot');

    return isClientRendered ? new PuppeteerAdapter() : new CheerioAdapter(html);
  }
}

export class CheerioAdapter implements CrawlerAdapter {
  constructor(private readonly cachedHtml?: string) {}

  async fetch(url: string): Promise<cheerio.CheerioAPI> {
    if (this.cachedHtml) return cheerio.load(this.cachedHtml);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'AuditFlow-Crawler/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    const html = await res.text();
    return cheerio.load(html);
  }
}

export class PuppeteerAdapter implements CrawlerAdapter {
  async fetch(url: string): Promise<cheerio.CheerioAPI> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('AuditFlow-Crawler/1.0');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
      const html = await page.content();
      return cheerio.load(html);
    } finally {
      await browser.close();
    }
  }
}
