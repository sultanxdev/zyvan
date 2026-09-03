import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { GithubIcon } from '@hugeicons/core-free-icons';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';

const productLinks = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

const developerLinks = [
  { label: 'Documentation', href: '/docs' },
  { label: 'GitHub', href: 'https://github.com/sultanxdev/zyvan', external: true },
];

const companyLinks = [
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: 'mailto:hello@zyvan.dev' },
];

export function Footer() {
  return (
    <footer className="overflow-hidden border-t border-black/[0.06] bg-white/70 backdrop-blur-xl">
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
        {/* Main footer */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-8">
          {/* Brand */}
          <div className="max-w-sm">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5"
            >
              <div className="flex size-8 items-center justify-center overflow-hidden rounded-xl bg-black shadow-xs transition-transform duration-200 group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Zyvan"
                  className="size-full rounded-lg object-cover"
                />
              </div>

              <span className="text-xl font-bold lowercase tracking-tight text-[#17172B]">
                zyvan
              </span>

              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                v0.1
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-500">
              Reliable event delivery for modern applications.
              Send events once and let Zyvan handle delivery, retries,
              signing, and delivery history.
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Built for developers</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#17172B]">
              Product
            </h3>

            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 transition-colors hover:text-[#17172B]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#17172B]">
              Developers
            </h3>

            <ul className="mt-4 space-y-3">
              {developerLinks.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-[#17172B]"
                    >
                      {link.label}
                      <Icon icon={GithubIcon} size={14} />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 transition-colors hover:text-[#17172B]"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#17172B]">
              Company
            </h3>

            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 transition-colors hover:text-[#17172B]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-black/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] text-zinc-400">
            &copy; {new Date().getFullYear()} Zyvan. All rights reserved.
          </p>

          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="font-mono text-[11px] text-zinc-400 transition-colors hover:text-zinc-700"
            >
              Privacy
            </Link>

            <Link
              href="/terms"
              className="font-mono text-[11px] text-zinc-400 transition-colors hover:text-zinc-700"
            >
              Terms
            </Link>

            <a
              href="https://github.com/sultanxdev/zyvan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 transition-colors hover:text-zinc-700"
            >
              <Icon icon={GithubIcon} size={13} />
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Large brand treatment */}
      <div className="mx-auto flex max-w-[1200px] select-none items-end justify-center overflow-hidden px-4 sm:px-6">
        <TextHoverEffect text="ZYVAN" duration={0.3} />
      </div>
    </footer>
  );
}
