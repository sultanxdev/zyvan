'use client';

import React from 'react';
import clsx from 'clsx';

export interface ParameterItem {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  description: React.ReactNode;
}

interface ParameterTableProps {
  parameters?: ParameterItem[];
  children?: React.ReactNode;
}

export function ParamField({
  name,
  type,
  required = false,
  defaultValue,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#141A17] py-3.5 last:border-b-0 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <code className="text-[#22C55E] font-semibold text-sm">{name}</code>
        <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-400">
          {type}
        </span>
        {required ? (
          <span className="rounded bg-red-950/40 border border-red-500/30 px-1.5 py-0.5 text-[10px] text-red-400 uppercase font-semibold">
            Required
          </span>
        ) : (
          <span className="rounded bg-zinc-900/60 border border-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-500 uppercase">
            Optional
          </span>
        )}
        {defaultValue && (
          <span className="text-zinc-500 text-[11px]">
            default: <code className="text-zinc-400">{defaultValue}</code>
          </span>
        )}
      </div>
      <div className="text-zinc-400 text-xs leading-relaxed space-y-1 pl-0.5">
        {children}
      </div>
    </div>
  );
}

export function ParameterTable({ parameters = [], children }: ParameterTableProps) {
  return (
    <div className="my-6 rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-4 font-mono">
      {parameters.length > 0 ? (
        <div className="divide-y divide-[#141A17]">
          {parameters.map((param, idx) => (
            <ParamField
              key={idx}
              name={param.name}
              type={param.type}
              required={param.required}
              defaultValue={param.defaultValue}
            >
              {param.description}
            </ParamField>
          ))}
        </div>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </div>
  );
}
