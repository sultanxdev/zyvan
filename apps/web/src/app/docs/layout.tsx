import React from 'react';
import { getDocsNavigation, getAllDocs, searchDocs } from '@/lib/mdx';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = getDocsNavigation();
  const allDocs = getAllDocs();

  // Precompute searchable index items for instant Cmd+K search
  const searchIndex = allDocs.flatMap((doc) => {
    const items = [
      {
        slug: doc.slug,
        title: doc.frontmatter.title,
        description: doc.frontmatter.description,
        category: doc.frontmatter.category || 'Documentation',
        apiMethod: doc.frontmatter.apiMethod,
      },
    ];

    doc.toc.forEach((h) => {
      items.push({
        slug: doc.slug,
        title: doc.frontmatter.title,
        description: `Section: ${h.text}`,
        category: doc.frontmatter.category || 'Documentation',
        heading: h.text,
        headingId: h.id,
        apiMethod: doc.frontmatter.apiMethod,
      });
    });

    return items;
  });

  return (
    <DocsLayoutClient categories={categories} searchIndex={searchIndex}>
      {children}
    </DocsLayoutClient>
  );
}
