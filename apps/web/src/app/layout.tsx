import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const newsreader = Newsreader({
  variable: '--font-serif',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Zyvan-Reliable Webhook & Event Delivery Infrastructure',
  description:
    'A multi-tenant webhook reliability engine that durably accepts events, asynchronously delivers them with RabbitMQ, retries transient failures with exponential backoff & jitter, and provides zero-overwrite DLQ replay.',
  keywords: [
    'webhooks',
    'event delivery',
    'webhook reliability',
    'idempotency',
    'dead letter queue',
    'rabbitmq',
    'retry backoff',
    'webhook security',
  ],
  authors: [{ name: 'Zyvan Engineering' }],
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-mono">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
