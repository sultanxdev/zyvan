'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface TabItem {
  label: string;
  language?: string;
  code: string;
  filename?: string;
  highlightLines?: number[];
}

interface CodeTabsProps {
  tabs?: TabItem[];
  items?: string[];
  children?: React.ReactNode;
}

export function CodeTabs({ tabs = [], items, children }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  if (tabs.length > 0) {
    const currentTab = tabs[activeTab] || tabs[0];

    const handleCopy = async () => {
      if (!currentTab.code) return;
      try {
        await navigator.clipboard.writeText(currentTab.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    };

    const lines = currentTab.code.trim().split('\n');

    return (
      <div className="group relative my-6 rounded-xl border border-white/[0.08] bg-[#0A0A0E] shadow-2xl overflow-hidden font-geist-mono font-mono text-[13px]">
        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-zinc-950 px-3 py-1.5 backdrop-blur-md">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab, idx) => {
              const isActive = idx === activeTab;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-850 text-[#00DC5A] shadow-sm border border-white/[0.08]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#00DC5A] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            aria-label="Copy snippet"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#00DC5A]" />
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

        {/* Code Content */}
        <div className="overflow-x-auto p-4 leading-relaxed text-zinc-200">
          {currentTab.filename && (
            <div className="mb-2 text-xs text-zinc-500 font-mono">
              // {currentTab.filename}
            </div>
          )}
          <pre className="font-geist-mono font-mono text-[13px]">
            <code>
              {lines.map((line, idx) => {
                const lineNum = idx + 1;
                const isHighlighted = currentTab.highlightLines?.includes(lineNum);
                return (
                  <div
                    key={idx}
                    className={`flex items-start ${
                      isHighlighted ? 'bg-[#00DC5A]/10 -mx-4 px-4 border-l-2 border-[#00DC5A]' : ''
                    }`}
                  >
                    <span className="w-8 shrink-0 select-none text-right pr-4 text-zinc-600 text-xs">
                      {lineNum}
                    </span>
                    <span className="flex-1">{line || ' '}</span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  const tabTitles = items || [];
  const childArray = React.Children.toArray(children);

  return (
    <div className="my-6 rounded-xl border border-white/[0.08] bg-[#0A0A0E] shadow-2xl overflow-hidden font-geist-mono font-mono text-[13px]">
      <div className="flex items-center border-b border-white/[0.06] bg-zinc-950 px-3 py-1.5 backdrop-blur-md">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabTitles.map((title, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                idx === activeTab
                  ? 'bg-zinc-850 text-[#00DC5A] shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">{childArray[activeTab] || childArray[0]}</div>
    </div>
  );
}

export function Tab({ children }: { title: string; children: React.ReactNode }) {
  return <div className="text-zinc-200">{children}</div>;
}
