import React from 'react';
import Link from 'next/link';
import {
  Callout,
  CodeBlock,
  CodeTabs,
  Tab,
  Steps,
  Step,
  ParamField,
  ParamGroup,
  ResponseField,
  ResponseGroup,
  EndpointBadge,
  CardGroup,
  Card,
  MermaidDiagram,
  ApiPlayground,
  Accordion,
  AccordionGroup,
} from './mdx';
import { slugify } from '@/lib/slugify';

function createHeading(level: 1 | 2 | 3 | 4) {
  const HeadingComponent = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = typeof children === 'string' ? children : String(children || '');
    const id = props.id || slugify(text);

    const baseClasses = {
      1: 'text-3xl font-bold tracking-tight text-white mb-4 mt-8 first:mt-0 font-sans',
      2: 'text-2xl font-semibold tracking-tight text-white mb-3 mt-10 border-b border-white/10 pb-2 font-sans group flex items-center gap-2',
      3: 'text-lg font-semibold text-zinc-100 mb-2 mt-8 font-sans group flex items-center gap-2',
      4: 'text-base font-semibold text-zinc-200 mb-2 mt-6 font-sans',
    };

    const Tag = `h${level}` as keyof JSX.IntrinsicElements;

    return React.createElement(
      Tag,
      {
        id,
        className: baseClasses[level],
        ...props,
      },
      React.createElement(
        React.Fragment,
        null,
        children,
        (level === 2 || level === 3)
          ? React.createElement(
              'a',
              {
                href: `#${id}`,
                className: 'opacity-0 group-hover:opacity-100 text-indigo-400 text-sm transition-opacity no-underline font-mono',
                'aria-label': `Link to ${text}`,
              },
              '#'
            )
          : null
      )
    );
  };

  HeadingComponent.displayName = `Heading${level}`;
  return HeadingComponent;
}

export const mdxComponentsMap = {
  // Standard HTML Elements
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className="text-[15px] leading-relaxed text-zinc-300 my-4 font-sans font-normal"
      {...props}
    />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-zinc-100" {...props} />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-zinc-300" {...props} />
  ),
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isInternal = href && (href.startsWith('/') || href.startsWith('#'));
    if (isInternal) {
      return (
        <Link
          href={href || '#'}
          className="font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/40 hover:decoration-indigo-300 transition-colors"
          {...props}
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/40 hover:decoration-indigo-300 transition-colors inline-flex items-center gap-1"
        {...props}
      >
        {children}
      </a>
    );
  },
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-4 space-y-2 list-disc list-outside ml-5 text-zinc-300 text-[15px] font-sans" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-4 space-y-2 list-decimal list-outside ml-5 text-zinc-300 text-[15px] font-sans" {...props} />
  ),
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed pl-1" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="rounded bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 font-mono text-[13px] text-amber-300 font-normal"
      {...props}
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <CodeBlock {...props} />
  ),
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/60 shadow-lg">
      <table className="w-full text-left text-sm font-sans border-collapse" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="border-b border-white/10 bg-zinc-900/60 text-xs font-semibold uppercase text-zinc-300 font-mono" {...props} />
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-3 text-zinc-300 font-medium" {...props} />
  ),
  tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="divide-y divide-white/5 text-zinc-300" {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-3 text-[13px]" {...props} />
  ),
  hr: () => <hr className="my-8 border-zinc-800" />,
  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-6 border-l-2 border-indigo-500 bg-indigo-950/10 pl-4 py-2 italic text-zinc-300 font-sans"
      {...props}
    />
  ),

  // Custom Components
  Callout,
  CodeBlock,
  CodeTabs,
  Tab,
  Steps,
  Step,
  ParamField,
  ParamGroup,
  ResponseField,
  ResponseGroup,
  EndpointBadge,
  CardGroup,
  Card,
  MermaidDiagram,
  ApiPlayground,
  Accordion,
  AccordionGroup,
};
