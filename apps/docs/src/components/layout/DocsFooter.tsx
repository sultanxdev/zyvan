import React from 'react';
import Link from 'next/link';
import { DOCS_LINKS } from '@/lib/constants';

export function DocsFooter() {
  return (
    <footer className="w-full border-t border-[#1B241F] bg-[#070908] py-8 px-4 sm:px-8 mt-16 font-mono text-xs text-zinc-500">
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">Zyvan</span>
          <span>— Enterprise Webhook & Event Delivery Infrastructure</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link href="/getting-started/quickstart" className="hover:text-zinc-300 transition-colors">
            Quickstart
          </Link>
          <Link href="/sdks/typescript-node" className="hover:text-zinc-300 transition-colors">
            SDK
          </Link>
          <Link href="/api-reference/events" className="hover:text-zinc-300 transition-colors">
            API Reference
          </Link>
          <a
            href={DOCS_LINKS.status}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" aria-hidden="true" />
            <span>Systems Normal</span>
          </a>
          <a
            href={DOCS_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
