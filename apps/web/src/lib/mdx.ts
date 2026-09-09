import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { slugify } from './slugify';
import {
  DocFrontmatter,
  TocItem,
  DocItem,
  NavCategory,
  SearchResultItem,
} from './docs-types';

export * from './slugify';
export * from './docs-types';

const DOCS_DIRECTORY = path.join(process.cwd(), 'content', 'docs');

/**
 * Extract Table of Contents from markdown/MDX content
 */
export function extractToc(content: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const rawText = match[2].trim();
    // Strip markdown formatting like bold, links, backticks
    const cleanText = rawText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1');

    const id = slugify(cleanText);

    toc.push({
      id,
      text: cleanText,
      level,
    });
  }

  return toc;
}

/**
 * Calculate estimated reading time
 */
export function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} min read`;
}

/**
 * Recursively find all MDX files in the docs directory
 */
function getMdxFilePaths(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getMdxFilePaths(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Convert file path to slug array
 */
function filePathToSlug(filePath: string): string[] {
  const relative = path.relative(DOCS_DIRECTORY, filePath);
  const normalized = relative.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.(mdx|md)$/, '');
  const parts = withoutExt.split('/');
  return parts;
}

/**
 * Get all docs with metadata
 */
export function getAllDocs(): DocItem[] {
  const filePaths = getMdxFilePaths(DOCS_DIRECTORY);

  const docs: DocItem[] = filePaths.map((filePath) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const slugArray = filePathToSlug(filePath);
    const slug = slugArray.join('/');
    const toc = extractToc(content);
    const readingTime = data.readTime || calculateReadingTime(content);

    return {
      slug,
      slugArray,
      frontmatter: {
        title: data.title || slugArray[slugArray.length - 1],
        description: data.description || '',
        category: data.category || (slugArray.length > 1 ? formatCategoryName(slugArray[0]) : 'Overview'),
        order: typeof data.order === 'number' ? data.order : 999,
        badge: data.badge,
        readTime: readingTime,
        apiMethod: data.apiMethod,
        apiPath: data.apiPath,
        status: data.status,
        lastUpdated: data.lastUpdated,
      },
      content,
      toc,
      readingTime,
      filePath,
    };
  });

  return docs;
}

function formatCategoryName(raw: string): string {
  const map: Record<string, string> = {
    'getting-started': 'Getting Started',
    'core-concepts': 'Core Concepts',
    'architecture': 'Architecture',
    'guides': 'Guides',
    'webhooks': 'Webhooks & Reliability',
    'api-reference': 'API Reference',
    'sdks': 'SDKs & Tools',
  };
  return map[raw] || raw.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const CATEGORY_ORDER = [
  'Getting Started',
  'Core Concepts',
  'Architecture',
  'Guides',
  'Webhooks & Reliability',
  'API Reference',
  'SDKs & Tools',
];

/**
 * Get organized navigation tree for sidebar
 */
export function getDocsNavigation(): NavCategory[] {
  const allDocs = getAllDocs();
  const categoryMap: Record<string, NavCategory['items']> = {};

  for (const doc of allDocs) {
    const category = doc.frontmatter.category || 'Overview';
    if (!categoryMap[category]) {
      categoryMap[category] = [];
    }

    categoryMap[category].push({
      slug: doc.slug,
      title: doc.frontmatter.title,
      description: doc.frontmatter.description,
      badge: doc.frontmatter.badge,
      apiMethod: doc.frontmatter.apiMethod,
      apiPath: doc.frontmatter.apiPath,
      order: doc.frontmatter.order,
    });
  }

  // Sort items inside each category
  for (const cat in categoryMap) {
    categoryMap[cat].sort((a, b) => {
      if ((a.order ?? 999) !== (b.order ?? 999)) {
        return (a.order ?? 999) - (b.order ?? 999);
      }
      return a.title.localeCompare(b.title);
    });
  }

  // Build sorted categories
  const result: NavCategory[] = [];

  for (const catName of CATEGORY_ORDER) {
    if (categoryMap[catName] && categoryMap[catName].length > 0) {
      result.push({
        title: catName,
        items: categoryMap[catName],
      });
      delete categoryMap[catName];
    }
  }

  // Any remaining categories
  for (const [catName, items] of Object.entries(categoryMap)) {
    result.push({
      title: catName,
      items,
    });
  }

  return result;
}

/**
 * Get a single doc by slug array or slug string
 */
export function getDocBySlug(slug: string | string[]): DocItem | null {
  const slugStr = Array.isArray(slug) ? slug.join('/') : slug;
  const allDocs = getAllDocs();
  const found = allDocs.find((d) => d.slug === slugStr);
  return found || null;
}

/**
 * Get previous and next documents for pagination
 */
export function getAdjacentDocs(currentSlug: string): {
  prev: { slug: string; title: string; category?: string } | null;
  next: { slug: string; title: string; category?: string } | null;
} {
  const nav = getDocsNavigation();
  const flatList: { slug: string; title: string; category: string }[] = [];

  for (const cat of nav) {
    for (const item of cat.items) {
      flatList.push({
        slug: item.slug,
        title: item.title,
        category: cat.title,
      });
    }
  }

  const currentIndex = flatList.findIndex((item) => item.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  const prev = currentIndex > 0 ? flatList[currentIndex - 1] : null;
  const next = currentIndex < flatList.length - 1 ? flatList[currentIndex + 1] : null;

  return { prev, next };
}

/**
 * Full-text search across docs and headings for Command Palette
 */
export function searchDocs(query: string): SearchResultItem[] {
  if (!query || query.trim() === '') return [];

  const q = query.toLowerCase().trim();
  const allDocs = getAllDocs();
  const results: SearchResultItem[] = [];

  for (const doc of allDocs) {
    const titleMatch = doc.frontmatter.title.toLowerCase().includes(q);
    const descMatch = doc.frontmatter.description.toLowerCase().includes(q);
    const apiMatch = doc.frontmatter.apiPath?.toLowerCase().includes(q);

    if (titleMatch || descMatch || apiMatch) {
      results.push({
        slug: doc.slug,
        title: doc.frontmatter.title,
        description: doc.frontmatter.description,
        category: doc.frontmatter.category || 'Documentation',
        apiMethod: doc.frontmatter.apiMethod,
      });
    }

    // Search in headings
    for (const heading of doc.toc) {
      if (heading.text.toLowerCase().includes(q) && !titleMatch) {
        results.push({
          slug: doc.slug,
          title: doc.frontmatter.title,
          description: `Section: ${heading.text}`,
          category: doc.frontmatter.category || 'Documentation',
          heading: heading.text,
          headingId: heading.id,
          apiMethod: doc.frontmatter.apiMethod,
        });
      }
    }
  }

  return results.slice(0, 15);
}
