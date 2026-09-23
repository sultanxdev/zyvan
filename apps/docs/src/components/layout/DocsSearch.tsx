'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Hash, CornerDownLeft, X, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { SearchDocItem } from '@/lib/types';

interface DocsSearchProps {
  isOpen: boolean;
  onClose: () => void;
  searchIndex: SearchDocItem[];
}

export function DocsSearch({ isOpen, onClose, searchIndex }: DocsSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredResults = React.useMemo(() => {
    if (!query.trim()) {
      return searchIndex.slice(0, 8);
    }
    const q = query.toLowerCase().trim();
    return searchIndex
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.heading?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [query, searchIndex]);

  const handleSelect = (item: SearchDocItem) => {
    onClose();
    if (item.headingId) {
      router.push(`/${item.slug}#${item.headingId}`);
    } else {
      router.push(`/${item.slug}`);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredResults[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 sm:pt-24 bg-black/85 backdrop-blur-md font-mono"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl border border-[#1B241F] bg-[#0B0D0C] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="relative flex items-center border-b border-[#1B241F] px-4 py-3 bg-[#070908]">
          <Search className="w-4 h-4 text-[#22C55E] mr-3 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results-list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search docs, endpoints, guides, and error codes..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 ml-2"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div
          id="search-results-list"
          role="listbox"
          className="max-h-96 overflow-y-auto p-2 space-y-1 scrollbar-thin"
        >
          {filteredResults.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              No results found for &ldquo;<span className="text-zinc-300">{query}</span>&rdquo;
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.slug}-${item.headingId || idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={clsx(
                    'flex items-center justify-between rounded-lg p-2.5 cursor-pointer text-xs transition-colors',
                    isSelected
                      ? 'bg-[#101412] text-zinc-100 border border-[#22C55E]/40'
                      : 'text-zinc-400 hover:bg-[#070908] border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        'flex h-6 w-6 items-center justify-center rounded shrink-0',
                        isSelected
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : 'bg-zinc-900 text-zinc-500'
                      )}
                    >
                      {item.heading ? (
                        <Hash className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 truncate">
                          {item.heading ? `${item.title} → ${item.heading}` : item.title}
                        </span>
                        {item.apiMethod && (
                          <span className="rounded bg-blue-950/40 border border-blue-500/30 px-1 py-0.2 text-[9px] text-blue-400 font-bold uppercase">
                            {item.apiMethod}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {item.description || item.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[#22C55E]" aria-hidden="true" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-[#1B241F] bg-[#070908] px-4 py-2 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-[#1B241F] bg-[#0B0D0C] px-1 py-0.5 text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="rounded border border-[#1B241F] bg-[#0B0D0C] px-1 py-0.5 text-[10px]">
                ↓
              </kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="rounded border border-[#1B241F] bg-[#0B0D0C] px-1 py-0.5 text-[10px]">
                ↵
              </kbd>{' '}
              to select
            </span>
          </div>
          <span>
            <kbd className="rounded border border-[#1B241F] bg-[#0B0D0C] px-1 py-0.5 text-[10px]">
              esc
            </kbd>{' '}
            to close
          </span>
        </div>
      </div>
    </div>
  );
}
