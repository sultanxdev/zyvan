import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  getAllDocSlugs,
  getDocBySlug,
  getAdjacentDocs,
} from '@/lib/content';
import { MdxRenderer } from '@/components/mdx/MdxRenderer';
import { SITE_CONFIG } from '@/lib/constants';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return slugs.map((slug) => ({
    slug: slug.split('/'),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const doc = getDocBySlug(resolvedParams.slug);

  if (!doc) {
    return {
      title: 'Not Found',
    };
  }

  const canonicalUrl = `${SITE_CONFIG.url}/${doc.slug}`;

  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${doc.frontmatter.title} — Zyvan Docs`,
      description: doc.frontmatter.description,
      url: canonicalUrl,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${doc.frontmatter.title} — Zyvan Docs`,
      description: doc.frontmatter.description,
    },
  };
}

import { TableOfContents } from '@/components/layout/TableOfContents';

export default async function DocPage({ params }: PageProps) {
  const resolvedParams = await params;
  const doc = getDocBySlug(resolvedParams.slug);

  if (!doc) {
    notFound();
  }

  const { prev, next } = getAdjacentDocs(doc.slug);
  const category =
    doc.frontmatter.sidebar?.group || doc.frontmatter.category || 'Documentation';

  return (
    <div className="flex w-full justify-between gap-6 font-mono">
      {/* Center Reading Column */}
      <div className="min-w-0 max-w-4xl flex-1 px-4 sm:px-8 py-8">
        {/* Breadcrumb Trail */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-zinc-500 mb-6">
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            Docs
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
          <span className="text-zinc-400">{category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
          <span className="text-[#22C55E] font-medium truncate">{doc.frontmatter.title}</span>
        </nav>

        {/* Document Header */}
        <header className="mb-8 border-b border-[#1B241F] pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="rounded bg-[#101412] border border-[#1B241F] px-2 py-0.5 text-xs text-zinc-400">
              {category}
            </span>
            {doc.frontmatter.badge && (
              <span className="rounded bg-[#22C55E]/10 border border-[#22C55E]/30 px-2 py-0.5 text-xs text-[#22C55E] font-medium">
                {doc.frontmatter.badge}
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>{doc.readingTime}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            {doc.frontmatter.title}
          </h1>

          {doc.frontmatter.description && (
            <p className="text-sm text-zinc-400 leading-relaxed">
              {doc.frontmatter.description}
            </p>
          )}
        </header>

        {/* MDX Body Content */}
        <main id="main-content">
          <MdxRenderer source={doc.content} />
        </main>

        {/* Previous / Next Navigation */}
        <nav
          aria-label="Previous and Next documents"
          className="mt-12 pt-6 border-t border-[#1B241F] grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {prev ? (
            <Link
              href={`/${prev.slug}`}
              className="flex flex-col rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-4 text-left hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors group"
            >
              <span className="flex items-center gap-1 text-xs text-zinc-500 mb-1 group-hover:text-zinc-400">
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </span>
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-[#22C55E] transition-colors truncate">
                {prev.title}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {next && (
            <Link
              href={`/${next.slug}`}
              className="flex flex-col items-end rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-4 text-right hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors group"
            >
              <span className="flex items-center gap-1 text-xs text-zinc-500 mb-1 group-hover:text-zinc-400">
                Next <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-[#22C55E] transition-colors truncate">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      </div>

      {/* Right Column: Table of Contents */}
      <TableOfContents toc={doc.toc} slug={doc.slug} />
    </div>
  );
}
