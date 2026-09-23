import type { Metadata, Viewport } from 'next';
import { MotionConfig } from 'motion/react';
import './globals.css';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SITE_CONFIG.title,
    template: '%s — Zyvan Docs',
  },
  description: SITE_CONFIG.description,
  keywords: [
    'webhooks',
    'event delivery',
    'webhook infrastructure',
    'idempotency',
    'dead-letter queue',
    'retry engine',
    'Node.js SDK',
    'Zyvan',
  ],
  authors: [{ name: 'Zyvan Team', url: 'https://zyvan.dev' }],
  creator: 'Zyvan',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_CONFIG.url,
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    siteName: 'Zyvan Documentation',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    creator: '@zyvandev',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
};

import { getNavigation, getSearchIndex } from '@/lib/content';
import { DocsShell } from '@/components/layout/DocsShell';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const groups = getNavigation();
  const searchIndex = getSearchIndex();

  return (
    <html lang="en" className="dark">
      <body className="bg-[#050505] text-[#F4F4F5] antialiased min-h-screen flex flex-col font-mono">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:bg-[#22C55E] focus:text-black focus:rounded focus:font-semibold text-xs"
        >
          Skip to content
        </a>
        <MotionConfig reducedMotion="user">
          <DocsShell groups={groups} searchIndex={searchIndex}>
            {children}
          </DocsShell>
        </MotionConfig>
      </body>
    </html>
  );
}
