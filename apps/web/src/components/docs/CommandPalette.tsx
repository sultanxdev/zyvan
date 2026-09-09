'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Hash,
  CornerDownLeft,
  X,
  Sparkles,
} from 'lucide-react';
import { SearchResultItem } from '@/lib/docs-types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  searchIndex: SearchResultItem[];
}

export function CommandPalette({ isOpen, onClose, searchIndex }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
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

  const filtered = React.useMemo(() => {
    if (!query.trim()) {
      return searchIndex.slice(0, 8);
    }
    const q = query.toLowerCase().trim();
    return searchIndex
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.heading?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, searchIndex]);

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    if (item.headingId) {
      router.push(`/docs/${item.slug}#${item.headingId}`);
    } else {
      router.push(`/docs/${item.slug}`);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 sm:pt-24 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-150 font-geist-mono font-mono">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0C0C10] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-white/10 px-4 py-3.5 bg-zinc-950/90">
          <Search className="w-5 h-5 text-[#00DC5A] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search documentation, guides, API endpoints..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-500 hover:text-zinc-300 mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              No results found for &ldquo;<span className="text-zinc-300">{query}</span>&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isHeading = Boolean(item.heading);

              return (
                <div
                  key={`${item.slug}-${item.headingId || idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#00DC5A]/10 border border-[#00DC5A]/30 text-white'
                      : 'text-zinc-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isHeading
                          ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          : 'bg-[#00DC5A]/10 text-[#00DC5A] border border-[#00DC5A]/20'
                      }`}
                    >
                      {isHeading ? (
                        <Hash className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100 truncate">
                          {item.heading || item.title}
                        </span>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-400">
                          {item.category}
                        </span>
                        {item.apiMethod && (
                          <span className="rounded bg-[#00DC5A]/10 border border-[#00DC5A]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#00DC5A]">
                            {item.apiMethod}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] text-[#00DC5A]">
                        <span>Jump</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px]">
                ↑
              </kbd>
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px]">
                ↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px]">
                ↵
              </kbd>
              Select
            </span>
          </div>

          <div className="flex items-center gap-1 text-[#00DC5A]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zyvan Search</span>
          </div>
        </div>
      </div>
    </div>
  );
}
