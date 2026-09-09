'use client';

import React, { useEffect, useState } from 'react';
import { TocItem } from '@/lib/mdx';
import {
  AlignLeft,
  Copy,
  Check,
  Github,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface TableOfContentsProps {
  toc: TocItem[];
  title?: string;
  filePath?: string;
}

export function TableOfContents({ toc, title, filePath }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '0px 0px -70% 0px',
        threshold: 0.1,
      }
    );

    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const githubEditUrl = filePath
    ? `https://github.com/sultanxdev/zyvan/blob/main/apps/web/content/docs/${filePath}`
    : 'https://github.com/sultanxdev/zyvan';

  if (toc.length === 0) {
    return null;
  }

  return (
    <aside className="sticky top-20 h-[calc(100vh-5rem)] w-64 overflow-y-auto px-4 py-4 font-sans select-none scrollbar-none hidden xl:block">
      {/* Table of Contents Header */}
      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
        <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
        <span>On this page</span>
      </div>

      {/* Headings List */}
      <nav className="space-y-1 text-xs border-l border-zinc-800/80 pl-3">
        {toc.map((item) => {
          const isActive = activeId === item.id;
          const isH3 = item.level === 3;
          const isH4 = item.level === 4;

          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block py-1 transition-all leading-snug ${
                isH3 ? 'pl-3' : isH4 ? 'pl-6' : ''
              } ${
                isActive
                  ? 'text-indigo-400 font-medium translate-x-0.5'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.text}
            </a>
          );
        })}
      </nav>

      {/* Quick Action Tools Box */}
      <div className="mt-8 border-t border-zinc-850 pt-5 space-y-2.5">
        <div className="text-[11px] font-mono uppercase font-semibold text-zinc-500 mb-2">
          Resources & Tools
        </div>

        {/* Copy Page URL */}
        <button
          onClick={handleCopyLink}
          className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Page URL Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
              <span>Copy page link</span>
            </>
          )}
        </button>

        {/* Edit on GitHub */}
        <a
          href={githubEditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all"
        >
          <Github className="w-3.5 h-3.5 text-zinc-500" />
          <span>Edit this page on GitHub</span>
        </a>

        {/* Community Discord */}
        <a
          href="https://discord.gg"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
          <span>Join Developer Community</span>
        </a>
      </div>
    </aside>
  );
}
