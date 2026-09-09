export interface DocFrontmatter {
  title: string;
  description: string;
  category?: string;
  order?: number;
  badge?: string;
  readTime?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  apiPath?: string;
  status?: string;
  lastUpdated?: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface DocItem {
  slug: string;
  slugArray: string[];
  frontmatter: DocFrontmatter;
  content: string;
  toc: TocItem[];
  readingTime: string;
  filePath: string;
}

export interface NavCategory {
  title: string;
  icon?: string;
  items: {
    slug: string;
    title: string;
    description?: string;
    badge?: string;
    apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    apiPath?: string;
    order?: number;
  }[];
}

export interface SearchResultItem {
  slug: string;
  title: string;
  description: string;
  category: string;
  heading?: string;
  headingId?: string;
  apiMethod?: string;
  matchSnippet?: string;
}
