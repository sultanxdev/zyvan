'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, Sparkles } from 'lucide-react';

export function FeedbackWidget() {
  const [feedbackState, setFeedbackState] = useState<'idle' | 'helpful' | 'unhelpful'>('idle');

  return (
    <div className="my-8 rounded-xl border border-white/[0.08] bg-zinc-950/60 p-4 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4 font-geist-mono font-mono">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#00DC5A]" />
        <span className="text-xs font-medium text-zinc-300">
          Was this page helpful?
        </span>
      </div>

      {feedbackState === 'idle' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFeedbackState('helpful')}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300 hover:text-[#00DC5A] hover:border-[#00DC5A]/30 hover:bg-[#00DC5A]/10 transition-all"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Yes</span>
          </button>
          <button
            onClick={() => setFeedbackState('unhelpful')}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/20 transition-all"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>No</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-[#00DC5A] font-medium">
          <Check className="w-3.5 h-3.5" />
          <span>Thanks for your feedback!</span>
        </div>
      )}
    </div>
  );
}
