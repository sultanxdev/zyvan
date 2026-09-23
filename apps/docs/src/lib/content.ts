import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type {
  DocMetadata,
  DocFrontmatter,
  TableOfContentsItem,
  NavGroup,
  SearchDocItem,
} from './types';

const CONTENT_PATH = path.join(process.cwd(), 'content');

const GROUP_ORDER: Record<string, number> = {
  'Getting Started': 1,
  'Core Concepts': 2,
  'SDKs & Tools': 3,
  'Guides': 4,
  'API Reference': 5,
  'Architecture': 6,
  'Resources': 7,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function calculateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function extractTableOfContents(rawContent: string): TableOfContentsItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const items: TableOfContentsItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(rawContent)) !== null) {
    const level = match[1].length as 2 | 3;
    const title = match[2].trim().replace(/`/g, '');
    const id = slugify(title);
    items.push({ id, title, level });
  }

  return items;
}

function getMdxFiles(dir: string, baseDir: string = dir): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMdxFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.mdx')) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push(relPath);
    }
  }

  return files;
}

export function getAllDocSlugs(): string[] {
  const files = getMdxFiles(CONTENT_PATH);
  return files.map((f) => f.replace(/\.mdx$/, ''));
}

export function getDocBySlug(slugOrPath: string | string[]): DocMetadata | null {
  const normalizedSlug = Array.isArray(slugOrPath) ? slugOrPath.join('/') : slugOrPath;
  const filePath = path.join(CONTENT_PATH, `${normalizedSlug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const rawFile = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(rawFile);
  const frontmatter = data as DocFrontmatter;

  const toc = extractTableOfContents(content);
  const readingTime = frontmatter.readTime || calculateReadingTime(content);

  return {
    slug: normalizedSlug,
    fullPath: filePath,
    frontmatter,
    toc,
    readingTime,
    content,
  };
}

export function getAllDocs(): DocMetadata[] {
  const slugs = getAllDocSlugs();
  const docs: DocMetadata[] = [];

  for (const slug of slugs) {
    const doc = getDocBySlug(slug);
    if (doc) docs.push(doc);
  }

  return docs;
}

export function getNavigation(): NavGroup[] {
  const docs = getAllDocs();
  const groupsMap = new Map<string, NavGroup>();

  for (const doc of docs) {
    const groupName =
      doc.frontmatter.sidebar?.group || doc.frontmatter.category || 'Documentation';
    const groupOrder = GROUP_ORDER[groupName] ?? 99;

    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, {
        name: groupName,
        order: groupOrder,
        items: [],
      });
    }

    const itemOrder =
      doc.frontmatter.sidebar?.order ?? doc.frontmatter.order ?? 99;

    groupsMap.get(groupName)!.items.push({
      title: doc.frontmatter.title,
      slug: doc.slug,
      badge: doc.frontmatter.sidebar?.badge || doc.frontmatter.badge,
      apiMethod: doc.frontmatter.apiMethod,
      order: itemOrder,
    });
  }

  // Sort groups by group order
  const sortedGroups = Array.from(groupsMap.values()).sort(
    (a, b) => a.order - b.order
  );

  // Sort items inside each group by order, then title
  for (const group of sortedGroups) {
    group.items.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });
  }

  return sortedGroups;
}

export function getAdjacentDocs(currentSlug: string): {
  prev: { title: string; slug: string } | null;
  next: { title: string; slug: string } | null;
} {
  const groups = getNavigation();
  const flatItems: { title: string; slug: string }[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      flatItems.push({ title: item.title, slug: item.slug });
    }
  }

  const currentIndex = flatItems.findIndex((item) => item.slug === currentSlug);
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? flatItems[currentIndex - 1] : null,
    next: currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null,
  };
}

export function getSearchIndex(): SearchDocItem[] {
  const docs = getAllDocs();
  const items: SearchDocItem[] = [];

  for (const doc of docs) {
    const category =
      doc.frontmatter.sidebar?.group || doc.frontmatter.category || 'Documentation';

    // Page-level entry
    items.push({
      slug: doc.slug,
      title: doc.frontmatter.title,
      description: doc.frontmatter.description || '',
      category,
      apiMethod: doc.frontmatter.apiMethod,
    });

    // Heading-level entries for deep search
    for (const h of doc.toc) {
      items.push({
        slug: doc.slug,
        title: doc.frontmatter.title,
        description: doc.frontmatter.description || '',
        category,
        heading: h.title,
        headingId: h.id,
      });
    }
  }

  return items;
}
