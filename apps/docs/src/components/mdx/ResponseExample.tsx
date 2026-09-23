'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

interface ResponseExampleProps {
  status?: number;
  statusText?: string;
  response: string | Record<string, unknown>;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
}

export function ResponseExample({
  status = 200,
  statusText = 'OK',
  response,
  requestHeaders,
  responseHeaders,
}: ResponseExampleProps) {
  const [activeTab, setActiveTab] = useState<'response' | 'headers'>('response');
  const [copied, setCopied] = useState(false);

  const formattedResponse =
    typeof response === 'string'
      ? response.trim()
      : JSON.stringify(response, null, 2);

  const isSuccess = status >= 200 && status < 300;
  const isError = status >= 400;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-6 rounded-lg border border-[#141A17] bg-[#070908] font-mono text-[13px] overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#141A17] bg-[#0B0D0C] px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span
            className={clsx(
              'rounded px-2 py-0.5 text-xs font-bold font-mono border',
              isSuccess && 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400',
              isError && 'bg-red-950/40 border-red-500/30 text-red-400',
              !isSuccess && !isError && 'bg-zinc-800 border-zinc-700 text-zinc-300'
            )}
          >
            {status} {statusText}
          </span>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => setActiveTab('response')}
              className={clsx(
                'rounded px-2.5 py-1 text-xs transition-colors',
                activeTab === 'response'
                  ? 'bg-[#1B241F] text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Response Body
            </button>
            {(requestHeaders || responseHeaders) && (
              <button
                type="button"
                onClick={() => setActiveTab('headers')}
                className={clsx(
                  'rounded px-2.5 py-1 text-xs transition-colors',
                  activeTab === 'headers'
                    ? 'bg-[#1B241F] text-zinc-100 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                Headers
              </button>
            )}
          </div>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy response payload"
          className="flex h-7 items-center gap-1 rounded border border-[#1B241F] bg-[#0B0D0C] px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:border-[#22C55E]/40 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C55E]"
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

      {/* Panel Content */}
      <div className="p-4 overflow-x-auto">
        {activeTab === 'response' ? (
          <pre className="text-zinc-300 leading-relaxed scrollbar-thin">
            <code>{formattedResponse}</code>
          </pre>
        ) : (
          <div className="space-y-3 text-xs">
            {requestHeaders && (
              <div>
                <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Request Headers
                </span>
                <div className="bg-[#0B0D0C] rounded p-2.5 space-y-1">
                  {Object.entries(requestHeaders).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-[#22C55E]">{k}:</span>
                      <span className="text-zinc-400">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {responseHeaders && (
              <div>
                <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Response Headers
                </span>
                <div className="bg-[#0B0D0C] rounded p-2.5 space-y-1">
                  {Object.entries(responseHeaders).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-blue-400">{k}:</span>
                      <span className="text-zinc-400">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
