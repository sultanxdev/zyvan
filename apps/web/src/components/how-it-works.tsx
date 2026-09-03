'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-20 sm:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <Badge
            variant="pill"
            className="mb-3 border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600"
          >
            How it works
          </Badge>

          <h2 className="text-2xl font-bold leading-[1.15] tracking-tight text-[#17172B] sm:text-4xl">
            Send it once. Zyvan takes care of the rest.
          </h2>

          <p className="mx-auto mt-3.5 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Send your event once. Zyvan delivers it and tries again when
            something goes wrong.
          </p>
        </div>

        {/* Diagram */}
        <div className="mx-auto max-w-[820px]">
          <div className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-white p-3 shadow-[0_2px_16px_rgba(0,0,0,0.02)] sm:p-6">
            <svg
              viewBox="0 0 900 560"
              className="block h-auto w-full"
              role="img"
              aria-labelledby="how-it-works-title how-it-works-description"
            >
              <title id="how-it-works-title">
                How Zyvan handles event delivery
              </title>

              <desc id="how-it-works-description">
                Your app sends an event to Zyvan. Zyvan delivers it to your
                server. Successful deliveries are completed, while failed
                deliveries are tried again.
              </desc>

              {/* Arrow definition */}
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="8.5"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 Z" fill="#94A3B8" />
                </marker>
              </defs>

              {/* =========================================================
                  ARROWS
              ========================================================= */}

              {/* Your App → Send event */}
              <line
                x1="285"
                y1="92"
                x2="585"
                y2="92"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />

              <text
                x="435"
                y="72"
                textAnchor="middle"
                fill="#71717A"
                fontSize="15"
                fontWeight="500"
              >
                Send
              </text>

              {/* Send event → Zyvan */}
              <line
                x1="705"
                y1="145"
                x2="705"
                y2="235"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />

              {/* Zyvan → Your Server */}
              <line
                x1="585"
                y1="285"
                x2="315"
                y2="285"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />

              <text
                x="450"
                y="265"
                textAnchor="middle"
                fill="#71717A"
                fontSize="15"
                fontWeight="500"
              >
                Deliver
              </text>

              {/* Your Server → Done */}
              <line
                x1="175"
                y1="340"
                x2="175"
                y2="430"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />

              <text
                x="205"
                y="385"
                fill="#71717A"
                fontSize="15"
                fontWeight="500"
              >
                Works
              </text>

              {/* Your Server → Retry */}
              <path
                d="M 305 335 C 385 365, 465 390, 560 435"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />

              <text
                x="445"
                y="385"
                textAnchor="middle"
                fill="#71717A"
                fontSize="15"
                fontWeight="500"
              >
                Fails
              </text>

              {/* Retry → Zyvan */}
              <path
                d="
                  M 790 475
                  C 855 425, 855 350, 815 300
                  C 790 270, 760 265, 705 265
                "
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />

              <text
                x="830"
                y="385"
                textAnchor="middle"
                fill="#71717A"
                fontSize="14"
                fontWeight="500"
              >
                Try again
              </text>

              {/* =========================================================
                  NODES
              ========================================================= */}

              {/* Your App */}
              <rect
                x="45"
                y="42"
                width="240"
                height="100"
                rx="20"
                fill="#EEF7FF"
                stroke="#CFE3F5"
                strokeWidth="1.5"
              />

              <text
                x="165"
                y="103"
                textAnchor="middle"
                fill="#17172B"
                fontSize="20"
                fontWeight="600"
              >
                Your App
              </text>

              {/* Send event */}
              <rect
                x="585"
                y="42"
                width="240"
                height="100"
                rx="20"
                fill="#FFF1E6"
                stroke="#F2D4BB"
                strokeWidth="1.5"
              />

              <text
                x="705"
                y="103"
                textAnchor="middle"
                fill="#17172B"
                fontSize="20"
                fontWeight="600"
              >
                Send event
              </text>

              {/* Your Server */}
              <rect
                x="45"
                y="235"
                width="270"
                height="100"
                rx="20"
                fill="#ECFAF2"
                stroke="#C8E8D7"
                strokeWidth="1.5"
              />

              <text
                x="180"
                y="296"
                textAnchor="middle"
                fill="#17172B"
                fontSize="20"
                fontWeight="600"
              >
                Your Server
              </text>

              {/* Zyvan */}
              <rect
                x="585"
                y="235"
                width="240"
                height="100"
                rx="20"
                fill="#FFF1E6"
                stroke="#F2D4BB"
                strokeWidth="1.5"
              />

              <text
                x="705"
                y="296"
                textAnchor="middle"
                fill="#17172B"
                fontSize="20"
                fontWeight="700"
              >
                Zyvan
              </text>

              {/* Done */}
              <rect
                x="45"
                y="430"
                width="270"
                height="90"
                rx="20"
                fill="#DDF8ED"
                stroke="#B9E9D2"
                strokeWidth="1.5"
              />

              <text
                x="180"
                y="487"
                textAnchor="middle"
                fill="#008F63"
                fontSize="21"
                fontWeight="700"
              >
                ✓ Done
              </text>

              {/* Retry */}
              <rect
                x="560"
                y="430"
                width="265"
                height="90"
                rx="20"
                fill="#F1EAFE"
                stroke="#D8C8F3"
                strokeWidth="1.5"
              />

              <text
                x="692"
                y="487"
                textAnchor="middle"
                fill="#17172B"
                fontSize="21"
                fontWeight="600"
              >
                Retry
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}