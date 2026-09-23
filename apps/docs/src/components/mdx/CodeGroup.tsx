'use client';

import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

export interface CodeTabItem {
  label: string;
  language?: string;
  filename?: string;
  code: string;
}

export interface CodeGroupProps {
  tabs?: CodeTabItem[];
  children?: React.ReactNode;
}

export function CodeBlock({
  code,
  language = 'bash',
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative my-4 rounded-lg border border-[#141A17] bg-[#070908] font-mono text-[13px] overflow-hidden group">
      {filename && (
        <div className="flex items-center justify-between border-b border-[#141A17] bg-[#0B0D0C] px-4 py-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300 font-medium">{filename}</span>
          </div>
          <span className="text-[11px] text-zinc-500 uppercase">{language}</span>
        </div>
      )}

      {/* Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code to clipboard"
        className="absolute top-2.5 right-2.5 z-10 flex h-7 items-center gap-1 rounded border border-[#1B241F] bg-[#0B0D0C]/80 px-2 text-xs text-zinc-400 opacity-80 hover:opacity-100 hover:text-zinc-200 hover:border-[#22C55E]/40 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C55E]"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 text-[#22C55E]"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copied</span>
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <pre className="overflow-x-auto p-4 text-zinc-300 leading-relaxed scrollbar-thin">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

export function CodeGroup({ tabs = [] }: CodeGroupProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!tabs || tabs.length === 0) return null;

  const currentTab = tabs[activeTab] || tabs[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentTab.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative my-6 rounded-lg border border-[#141A17] bg-[#070908] font-mono text-[13px] overflow-hidden group">
      {/* Tab Header Bar */}
      <div className="flex items-center justify-between border-b border-[#141A17] bg-[#0B0D0C] px-2 py-1.5 overflow-x-auto">
        <div className="flex items-center gap-1">
          {tabs.map((tab, idx) => {
            const isActive = idx === activeTab;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={clsx(
                  'relative rounded px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C55E]',
                  isActive ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCodeTab"
                    className="absolute inset-0 rounded bg-[#1B241F] border border-[#22C55E]/30"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy active code snippet"
          className="flex h-7 items-center gap-1 rounded border border-[#1B241F] bg-[#0B0D0C]/80 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:border-[#22C55E]/40 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C55E]"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 text-[#22C55E]"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copied</span>
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Code Area */}
      <pre className="overflow-x-auto p-4 text-zinc-300 leading-relaxed scrollbar-thin">
        <code>{currentTab.code.trim()}</code>
      </pre>
    </div>
  );
}

// Backward-compatible alias
export const CodeTabs = CodeGroup;
