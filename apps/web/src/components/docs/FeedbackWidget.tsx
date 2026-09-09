'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, Sparkles } from 'lucide-react';

export function FeedbackWidget() {
  const [feedbackState, setFeedbackState] = useState<'idle' | 'helpful' | 'unhelpful'>('idle');

  return (
    <div className="my-8 rounded-xl border border-white/10 bg-zinc-950/60 p-4 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4 font-sans">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-zinc-300">
          Was this page helpful?
        </span>
      </div>

      {feedbackState === 'idle' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFeedbackState('helpful')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-950/20 transition-all"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Yes</span>
          </button>
          <button
            onClick={() => setFeedbackState('unhelpful')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/20 transition-all"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>No</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <Check className="w-3.5 h-3.5" />
          <span>Thanks for your feedback!</span>
        </div>
      )}
    </div>
  );
}
