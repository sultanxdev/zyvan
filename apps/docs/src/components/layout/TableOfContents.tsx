'use client';

import React, { useEffect, useState } from 'react';
import { AlignLeft, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import type { TableOfContentsItem } from '@/lib/types';

function GithubIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

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
            <GithubIcon className="w-3.5 h-3.5" />
            <span>Edit on GitHub</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
