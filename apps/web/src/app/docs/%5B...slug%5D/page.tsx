import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import { getAllDocs, getDocBySlug, getAdjacentDocs } from '@/lib/mdx';
import { MdxContentRenderer } from '@/components/docs/MdxContentRenderer';
import { TableOfContents } from '@/components/docs/TableOfContents';
import { DocsPagination } from '@/components/docs/DocsPagination';
import { FeedbackWidget } from '@/components/docs/FeedbackWidget';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slugArray,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    return {
      title: 'Documentation Not Found | Zyvan',
    };
  }

  return {
    title: `${doc.frontmatter.title} | Zyvan Documentation`,
    description: doc.frontmatter.description,
    openGraph: {
      title: `${doc.frontmatter.title} — Zyvan Docs`,
      description: doc.frontmatter.description,
      type: 'article',
    },
  };
}

export default async function DocSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  const { prev, next } = getAdjacentDocs(doc.slug);

  return (
    <div className="flex w-full justify-between gap-8 font-geist-mono font-mono">
      {/* Center Reading Column */}
      <div className="min-w-0 max-w-4xl flex-1">
        {/* Breadcrumb Trail */}
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-6">
          <Link href="/docs/getting-started/introduction" className="hover:text-zinc-200 transition-colors">
            Docs
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-zinc-400">{doc.frontmatter.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[#00DC5A] font-medium truncate">{doc.frontmatter.title}</span>
        </nav>

        {/* Document Header */}
        <div className="mb-8 border-b border-white/[0.08] pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {doc.frontmatter.category && (
              <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300 font-medium">
                {doc.frontmatter.category}
              </span>
            )}
            {doc.frontmatter.badge && (
              <span className="rounded-full bg-[#00DC5A]/10 border border-[#00DC5A]/30 px-2.5 py-0.5 text-xs text-[#00DC5A] font-medium">
                {doc.frontmatter.badge}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>{doc.readingTime}</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {doc.frontmatter.title}
          </h1>

          {doc.frontmatter.description && (
            <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed">
              {doc.frontmatter.description}
            </p>
          )}
        </div>

        {/* Dynamic MDX Content */}
        <MdxContentRenderer source={doc.content} />

        {/* Bottom Pagination (Prev / Next) */}
        <DocsPagination prev={prev} next={next} />

        {/* Feedback Widget */}
        <FeedbackWidget />
      </div>

      {/* Right Column: Table of Contents */}
      <TableOfContents
        toc={doc.toc}
        title={doc.frontmatter.title}
        filePath={doc.slug + '.mdx'}
      />
    </div>
  );
}
