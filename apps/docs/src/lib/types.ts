export interface DocFrontmatter {
  title: string;
  description: string;
  category?: string;
  order?: number;
  badge?: string;
  readTime?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  apiEndpoint?: string;
  sidebar?: {
    group: string;
    order?: number;
    badge?: string;
  };
  toc?: boolean;
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: 2 | 3;
}

export interface DocMetadata {
  slug: string;
  fullPath: string;
  frontmatter: DocFrontmatter;
  toc: TableOfContentsItem[];
  readingTime: string;
  content: string;
}

export interface NavItem {
  title: string;
  slug: string;
  badge?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  order: number;
}

export interface NavGroup {
  name: string;
  order: number;
  items: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface SearchDocItem {
  slug: string;
  title: string;
  description: string;
  category: string;
  heading?: string;
  headingId?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}
