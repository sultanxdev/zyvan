'use client';

import React, { useState } from 'react';
import { Check, Copy, Terminal, FileCode } from 'lucide-react';

interface CodeBlockProps {
  children?: React.ReactNode;
  code?: string;
  language?: string;
  filename?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
}

export function CodeBlock({
  children,
  code: codeProp,
  language = 'bash',
  filename,
  highlightLines = [],
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const extractText = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (React.isValidElement(node) && (node.props as { children?: React.ReactNode })?.children) {
      return extractText((node.props as { children?: React.ReactNode }).children);
    }
    return '';
  };

  const rawCode = (codeProp || extractText(children) || '').trim();

  const handleCopy = async () => {
    if (!rawCode) return;
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const lines = rawCode.split('\n');

  return (
    <div className="group relative my-6 rounded-xl border border-white/[0.08] bg-[#0A0A0E] shadow-2xl overflow-hidden font-geist-mono font-mono text-[13px]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-zinc-950 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {filename ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
              <FileCode className="w-3.5 h-3.5 text-[#00DC5A]" />
              <span>{filename}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Terminal className="w-3.5 h-3.5 text-[#00DC5A]" />
              <span className="uppercase tracking-wider font-semibold text-[11px] text-zinc-400">
                {language}
              </span>
            </div>
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#00DC5A] animate-in zoom-in-50" />
              <span className="text-[#00DC5A] text-[11px] font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
              <span className="text-zinc-400 group-hover:text-zinc-200 text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Container */}
      <div className="overflow-x-auto p-4 leading-relaxed text-zinc-200">
        <pre className="font-geist-mono font-mono text-[13px]">
          {showLineNumbers || highlightLines.length > 0 ? (
            <code>
              {lines.map((line, idx) => {
                const lineNum = idx + 1;
                const isHighlighted = highlightLines.includes(lineNum);
                return (
                  <div
                    key={idx}
                    className={`flex items-start ${
                      isHighlighted ? 'bg-[#00DC5A]/10 -mx-4 px-4 border-l-2 border-[#00DC5A]' : ''
                    }`}
                  >
                    {showLineNumbers && (
                      <span className="w-8 shrink-0 select-none text-right pr-4 text-zinc-600 text-xs">
                        {lineNum}
                      </span>
                    )}
                    <span className="flex-1">{line || ' '}</span>
                  </div>
                );
              })}
            </code>
          ) : (
            <code>{children || rawCode}</code>
          )}
        </pre>
      </div>
    </div>
  );
}
