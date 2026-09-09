'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-zinc-950/40 backdrop-blur-sm overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left font-sans text-sm font-semibold text-zinc-100 hover:text-white hover:bg-white/5 transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-white/5 p-4 text-sm text-zinc-300 font-sans leading-relaxed prose-strong:text-zinc-100 prose-code:text-amber-300">
          {children}
        </div>
      )}
    </div>
  );
}

export function AccordionGroup({ children }: { children: React.ReactNode }) {
  return <div className="my-6 space-y-3">{children}</div>;
}
