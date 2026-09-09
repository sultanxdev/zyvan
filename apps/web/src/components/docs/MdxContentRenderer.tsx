import React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { mdxComponentsMap } from './MdxComponents';
import remarkGfm from 'remark-gfm';

interface MdxContentRendererProps {
  source: string;
}

export function MdxContentRenderer({ source }: MdxContentRendererProps) {
  return (
    <div className="mdx-content text-zinc-300 font-sans leading-relaxed">
      <MDXRemote
        source={source}
        components={mdxComponentsMap}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
    </div>
  );
}
