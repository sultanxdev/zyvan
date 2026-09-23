'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface TabProps {
  label: string;
  children: React.ReactNode;
}

export function Tab({ children }: TabProps) {
  return <div>{children}</div>;
}

interface TabsProps {
  children: React.ReactNode;
  defaultIndex?: number;
}

export function Tabs({ children, defaultIndex = 0 }: TabsProps) {
  const tabs = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabProps> => React.isValidElement(child)
  );

  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  if (tabs.length === 0) return null;

  return (
    <div className="my-6 rounded-lg border border-[#1B241F] bg-[#0B0D0C] overflow-hidden font-mono">
      {/* Tab bar header */}
      <div
        className="flex items-center gap-1 border-b border-[#1B241F] bg-[#070908] px-3 py-2 overflow-x-auto"
        role="tablist"
      >
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIndex;
          const label = tab.props.label || `Tab ${idx + 1}`;

          return (
            <button
              key={idx}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveIndex(idx)}
              className={clsx(
                'relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C55E]',
                isActive ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-md bg-[#1B241F]/80 border border-[#22C55E]/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panel */}
      <div className="p-4" role="tabpanel">
        {tabs[activeIndex]}
      </div>
    </div>
  );
}
