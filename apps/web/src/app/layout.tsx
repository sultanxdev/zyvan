import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
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
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
