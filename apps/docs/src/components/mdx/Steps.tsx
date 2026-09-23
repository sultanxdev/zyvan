'use client';

import React from 'react';

interface StepProps {
  title: string;
  stepNumber?: number;
  children: React.ReactNode;
}

export function Step({ title, stepNumber, children }: StepProps) {
  return (
    <div className="relative pl-8 pb-8 last:pb-2">
      {/* Activity line connector */}
      <div
        className="absolute left-[11px] top-7 bottom-0 w-[1px] bg-[#1B241F]"
        aria-hidden="true"
      />

      {/* Number Badge */}
      <div
        className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-[#22C55E]/40 bg-[#0B0D0C] text-[11px] font-semibold text-[#22C55E] font-mono shadow-sm"
        aria-hidden="true"
      >
        {stepNumber}
      </div>

      <div>
        <h3 className="font-semibold text-sm text-zinc-100 mb-2 font-mono">
          {title}
        </h3>
        <div className="text-xs sm:text-sm text-zinc-400 space-y-3 font-mono">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Steps({ children }: { children: React.ReactNode }) {
  // Inject index as stepNumber automatically
  const stepElements = React.Children.map(children, (child, idx) => {
    if (React.isValidElement<StepProps>(child)) {
      return React.cloneElement(child, {
        stepNumber: child.props.stepNumber ?? idx + 1,
      });
    }
    return child;
  });

  return <div className="my-6">{stepElements}</div>;
}
