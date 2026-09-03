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
  {
    label: 'GitHub',
    href: 'https://github.com/sultanxdev/zyvan',
    external: true,
  },
];

const companyLinks = [
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: 'mailto:hello@zyvan.dev' },
];

export function Footer() {
  return (
    <footer className="overflow-hidden border-t border-black/[0.06] bg-gray-100/70 backdrop-blur-xl">
      <div className="mx-auto max-w-[1040px] px-4 pt-14 sm:px-6 sm:pt-16">
        {/* Main footer grid */}
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
              Reliable webhook delivery for modern applications. Send once,
              and let Zyvan handle delivery, retries,
              delivery history and  keeps every attempt traceable.
            </p>

            {/* Small status */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 shadow-2xs">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>

              <span className="font-mono text-[11px] text-zinc-500">
                Built for reliable webhook delivery
              </span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#17172B]">
              Product
            </h3>

            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 transition-colors duration-200 hover:text-[#17172B]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#17172B]">
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
                      className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors duration-200 hover:text-[#17172B]"
                    >
                      {link.label}
                      <Icon icon={GithubIcon} size={14} />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 transition-colors duration-200 hover:text-[#17172B]"
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
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#17172B]">
              Company
            </h3>

            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 transition-colors duration-200 hover:text-[#17172B]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-black/[0.06] py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-zinc-400">
            <div className="inline-flex items-center gap-2">
              <div className="flex size-4 items-center justify-center overflow-hidden rounded-sm bg-black shadow-2xs">
                <img
                  src="/logo.png"
                  alt="Zyvan"
                  className="size-full rounded-xs object-cover"
                />
              </div>
              <span>
                &copy; {new Date().getFullYear()} Zyvan
              </span>
            </div>

            <span className="text-zinc-300">&middot;</span>

            <Link
              href="/privacy"
              className="transition-colors hover:text-zinc-700"
            >
              Privacy
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-zinc-700"
            >
              Terms
            </Link>
          </div>

          {/* Built by */}
          <a
            href="https://sultanx.dev"
            className="group inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 transition-colors duration-200 hover:text-[#17172B]"
          >
            <span>Built by</span>

            <span className="font-semibold text-zinc-600 transition-colors group-hover:text-[#00A63E]">
              sultanxdev
            </span>

            <span className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              ↗
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}