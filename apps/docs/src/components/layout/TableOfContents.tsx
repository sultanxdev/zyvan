'use client';

import React, { useEffect, useState } from 'react';
import { AlignLeft, Copy, Check, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import type { TableOfContentsItem } from '@/lib/types';

interface TableOfContentsProps {
  toc: TableOfContentsItem[];
  slug?: string;
}

export function TableOfContents({ toc, slug }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (toc.length === 0) return;

    if (!activeId && toc[0]) {
      setActiveId(toc[0].id);
    }

    const handleScroll = () => {
      const headingElements = toc
        .map((item) => document.getElementById(item.id))
        .filter(Boolean) as HTMLElement[];

      const scrollPosition = window.scrollY + 140;

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const el = headingElements[i];
        if (el.offsetTop <= scrollPosition) {
          setActiveId(el.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc, activeId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const scrollToHeading = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      setActiveId(id);
      window.history.pushState(null, '', `#${id}`);
    }
  };

  if (toc.length === 0) {
    return null;
  }

  const githubEditUrl = slug
    ? `https://github.com/sultanxdev/zyvan/blob/main/apps/docs/content/${slug}.mdx`
    : 'https://github.com/sultanxdev/zyvan';

  return (
    <aside
      aria-label="Table of contents"
      className="hidden xl:block w-64 shrink-0 py-8 pl-6 border-l border-[#1B241F] font-mono text-xs select-none"
    >
      <div className="sticky top-24 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-300 font-semibold mb-3">
            <AlignLeft className="w-3.5 h-3.5 text-[#22C55E]" aria-hidden="true" />
            <span className="uppercase tracking-wider text-[11px]">On this page</span>
          </div>

          <nav className="space-y-1">
            {toc.map((item) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToHeading(e, item.id)}
                  className={clsx(
                    'block py-1 text-xs transition-colors truncate',
                    item.level === 3 ? 'pl-4' : 'pl-1',
                    isActive
                      ? 'text-[#22C55E] font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {item.title}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Quick Utility Links */}
        <div className="border-t border-[#141A17] pt-4 space-y-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors w-full text-left"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copiedLink ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 text-[#22C55E]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Link copied</span>
                </motion.span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy page URL</span>
                </span>
              )}
            </AnimatePresence>
          </button>

          <a
            href={githubEditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Edit on GitHub</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
