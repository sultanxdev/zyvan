'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="my-3 rounded-lg border border-[#1B241F] bg-[#0B0D0C] overflow-hidden transition-all font-mono">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold text-zinc-200 hover:text-zinc-100 hover:bg-[#101412] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C55E]"
      >
        <span>{title}</span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-zinc-500 transition-transform duration-200',
            isOpen && 'rotate-180 text-[#22C55E]'
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t border-[#141A17] p-4 text-xs text-zinc-300 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function AccordionGroup({ children }: { children: React.ReactNode }) {
  return <div className="my-6 space-y-2">{children}</div>;
}
