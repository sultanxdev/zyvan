import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Helper to recursively collect all .mdx files
function getMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMdxFiles(fullPath));
    } else if (entry.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

const CONTENT_DIR = path.resolve(__dirname, '../../content');

describe('Documentation Contract & Integrity Suite', () => {
  const mdxFiles = getMdxFiles(CONTENT_DIR);

  it('found all expected documentation MDX files (>30 pages)', () => {
    expect(mdxFiles.length).toBeGreaterThanOrEqual(30);
  });

  describe('1. Frontmatter Validation', () => {
    it.each(mdxFiles.map((file) => [path.relative(CONTENT_DIR, file), file]))(
      'file %s has valid frontmatter schema',
      (_relPath, filePath) => {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(raw);
        const data = parsed.data;

        expect(data).toBeDefined();
        expect(typeof data.title).toBe('string');
        expect(data.title.trim().length).toBeGreaterThanOrEqual(3);

        expect(typeof data.description).toBe('string');
        expect(data.description.trim().length).toBeGreaterThanOrEqual(10);

        const category = data.sidebar?.group || data.category;
        expect(typeof category).toBe('string');
        expect(category.trim().length).toBeGreaterThan(0);

        const order = data.sidebar?.order ?? data.order;
        if (order !== undefined) {
          expect(typeof order).toBe('number');
          expect(order).toBeGreaterThanOrEqual(0);
        }
      }
    );
  });

  describe('2. Internal Link Integrity (Zero Broken Links)', () => {
    // Collect all valid slugs in content
    const validSlugs = new Set<string>();
    validSlugs.add('/'); // Root landing page

    for (const file of mdxFiles) {
      const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      const slug = rel.replace(/\.mdx$/, '');
      validSlugs.add(`/${slug}`);
    }

    it('validates that internal markdown links resolve to valid routes', () => {
      const brokenLinks: { file: string; link: string }[] = [];

      for (const file of mdxFiles) {
        const raw = fs.readFileSync(file, 'utf8');
        const linkRegex = /\[([^\]]+)\]\(((\/[a-zA-Z0-9\-_#/]+))\)/g;
        let match: RegExpExecArray | null;

        while ((match = linkRegex.exec(raw)) !== null) {
          const rawLink = match[2];
          // Strip anchor hash
          const cleanPath = rawLink.split('#')[0];
          if (cleanPath && cleanPath !== '' && !validSlugs.has(cleanPath)) {
            brokenLinks.push({
              file: path.relative(CONTENT_DIR, file),
              link: rawLink,
            });
          }
        }
      }

      expect(brokenLinks).toEqual([]);
    });

    it('validates that root landing page links resolve to valid routes', () => {
      const pagePath = path.resolve(__dirname, '../app/page.tsx');
      const pageContent = fs.readFileSync(pagePath, 'utf8');
      const hrefRegex = /href="(\/[a-zA-Z0-9\-_#/]+)"/g;
      let match: RegExpExecArray | null;
      const brokenLinks: string[] = [];

      while ((match = hrefRegex.exec(pageContent)) !== null) {
        const rawLink = match[1];
        const cleanPath = rawLink.split('#')[0];
        if (cleanPath && cleanPath !== '' && !validSlugs.has(cleanPath)) {
          brokenLinks.push(rawLink);
        }
      }

      expect(brokenLinks).toEqual([]);
    });
  });

  describe('3. SDK Contract Alignment', () => {
    const sdkSrcDir = path.resolve(__dirname, '../../../../packages/sdk/src');
    const sdkIndexPath = path.join(sdkSrcDir, 'index.ts');
    const sdkWebhooksPath = path.join(sdkSrcDir, 'webhooks.ts');

    it('verifies SDK exports referenced in docs exist in @zyvan/sdk', () => {
      expect(fs.existsSync(sdkIndexPath)).toBe(true);
      expect(fs.existsSync(sdkWebhooksPath)).toBe(true);

      const indexContent = fs.readFileSync(sdkIndexPath, 'utf8');
      const webhooksContent = fs.readFileSync(sdkWebhooksPath, 'utf8');

      // Core classes documented in docs
      const documentedIdentifiers = [
        'ZyvanClient',
        'webhooks',
        'WebhookVerificationError',
        'ZyvanError',
        'AuthenticationError',
        'RateLimitError',
        'ConflictError',
      ];

      for (const id of documentedIdentifiers) {
        const found =
          indexContent.includes(id) || webhooksContent.includes(id);
        expect(found).toBe(true);
      }
    });
  });

  describe('4. Proxy Route Security Constraints', () => {
    const ALLOWED_PATTERNS = [
      /^v1\/events(\/.*)?$/,
      /^v1\/destinations(\/.*)?$/,
      /^v1\/dead-letters(\/.*)?$/,
      /^v1\/projects(\/.*)?$/,
      /^v1\/tenants(\/.*)?$/,
    ];

    function isRouteAllowed(rawPath: string): boolean {
      return ALLOWED_PATTERNS.some((pattern) => pattern.test(rawPath));
    }

    it('permits authorized API endpoints', () => {
      expect(isRouteAllowed('v1/events')).toBe(true);
      expect(isRouteAllowed('v1/events/evt_123')).toBe(true);
      expect(isRouteAllowed('v1/destinations')).toBe(true);
      expect(isRouteAllowed('v1/destinations/dst_123/test')).toBe(true);
      expect(isRouteAllowed('v1/dead-letters')).toBe(true);
      expect(isRouteAllowed('v1/dead-letters/summary')).toBe(true);
      expect(isRouteAllowed('v1/tenants')).toBe(true);
      expect(isRouteAllowed('v1/projects')).toBe(true);
    });

    it('strictly forbids SSRF and unauthorized paths', () => {
      expect(isRouteAllowed('admin')).toBe(false);
      expect(isRouteAllowed('v1/internal/secrets')).toBe(false);
      expect(isRouteAllowed('latest/meta-data')).toBe(false);
      expect(isRouteAllowed('169.254.169.254')).toBe(false);
      expect(isRouteAllowed('../../etc/passwd')).toBe(false);
    });
  });
});
