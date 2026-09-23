import React from 'react';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { MDX_COMPONENTS } from './index';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function createHeading(level: 1 | 2 | 3 | 4) {
  const HeadingComponent = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = typeof children === 'string' ? children : String(children || '');
    const id = props.id || slugify(text);

    const baseClasses = {
      1: 'text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-4 mt-8 first:mt-0 font-mono',
      2: 'text-xl sm:text-2xl font-bold tracking-tight text-white mb-3 mt-10 border-b border-[#1B241F] pb-2 font-mono group flex items-center gap-2',
      3: 'text-base sm:text-lg font-semibold text-zinc-100 mb-2 mt-8 font-mono group flex items-center gap-2',
      4: 'text-sm sm:text-base font-semibold text-zinc-200 mb-2 mt-6 font-mono',
    };

    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';

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
        level === 2 || level === 3
          ? React.createElement(
              'a',
              {
                href: `#${id}`,
                className:
                  'opacity-0 group-hover:opacity-100 text-[#22C55E] text-sm transition-opacity no-underline font-mono focus:opacity-100',
                'aria-label': `Direct link to ${text}`,
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

const htmlComponents = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-sm leading-relaxed text-zinc-300 my-4 font-mono" {...props} />
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
          className="font-medium text-[#22C55E] hover:underline underline-offset-4 decoration-[#22C55E]/40 hover:decoration-[#22C55E] transition-colors"
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
        className="font-medium text-[#22C55E] hover:underline underline-offset-4 decoration-[#22C55E]/40 hover:decoration-[#22C55E] transition-colors"
        {...props}
      >
        {children}
      </a>
    );
  },
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside space-y-1.5 my-4 text-sm text-zinc-300 pl-2 font-mono" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside space-y-1.5 my-4 text-sm text-zinc-300 pl-2 font-mono" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed marker:text-[#22C55E]" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-2 border-[#22C55E]/40 bg-[#0B0D0C] pl-4 py-2 my-4 text-sm text-zinc-400 italic rounded-r"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-[#1B241F]" />,
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-[#1B241F] bg-[#070908]">
      <table className="w-full text-left text-xs font-mono" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="border-b border-[#1B241F] bg-[#0B0D0C] text-zinc-300 font-semibold" {...props} />
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-3 text-left font-semibold text-zinc-200" {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-t border-[#141A17] px-4 py-2.5 text-zinc-400 leading-normal" {...props} />
  ),
  code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    // If inside a pre tag, code will be formatted there
    return (
      <code
        className="rounded bg-[#101412] border border-[#1B241F] px-1.5 py-0.5 text-xs text-[#22C55E] font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => {
    // Simple inline pre styling if not caught by CodeBlock
    return (
      <div className="my-4 rounded-lg border border-[#141A17] bg-[#070908] p-4 overflow-x-auto text-[13px] font-mono text-zinc-300">
        <pre>{children}</pre>
      </div>
    );
  },
};

export const combinedMdxComponents = {
  ...htmlComponents,
  ...MDX_COMPONENTS,
};

export function MdxRenderer({ source }: { source: string }) {
  return (
    <div className="mdx-body max-w-none text-zinc-300 font-mono">
      <MDXRemote
        source={source}
        components={combinedMdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
    </div>
  );
}
