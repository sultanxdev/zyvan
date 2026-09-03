'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface TextHoverEffectProps {
  text: string;
  duration?: number;
  className?: string;
  baseColor?: string;
  hoverColor?: string;
}

export function TextHoverEffect({
  text,
  duration = 0.5,
  className = '',
  baseColor = '#E6E6EB',
  hoverColor = '#00DC5A',
}: TextHoverEffectProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const [cursor, setCursor] = useState({
    x: 0,
    y: 0,
  });

  const [hovered, setHovered] = useState(false);

  const [maskPosition, setMaskPosition] = useState({
    cx: '50%',
    cy: '50%',
  });

  const rawId = useId();

  // React useId contains characters that are not ideal for SVG ids.
  const id = rawId.replace(/:/g, '');

  const fillGradientId = `text-fill-${id}`;
  const strokeGradientId = `text-stroke-${id}`;
  const revealGradientId = `text-reveal-${id}`;
  const maskId = `text-mask-${id}`;

  useEffect(() => {
    if (!svgRef.current || !cursor.x || !cursor.y) return;

    const rect = svgRef.current.getBoundingClientRect();

    const cx = ((cursor.x - rect.left) / rect.width) * 100;
    const cy = ((cursor.y - rect.top) / rect.height) * 100;

    setMaskPosition({
      cx: `${Math.max(0, Math.min(100, cx))}%`,
      cy: `${Math.max(0, Math.min(100, cy))}%`,
    });
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 900 220"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      className={`block h-auto w-full select-none ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) =>
        setCursor({
          x: e.clientX,
          y: e.clientY,
        })
      }
      role="img"
      aria-label={text}
    >
      <defs>
        {/* Vibrant green fill */}
        <linearGradient
          id={fillGradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={hoverColor} />
          <stop offset="50%" stopColor={hoverColor} />
          <stop offset="100%" stopColor={hoverColor} />
        </linearGradient>

        {/* Vibrant green outline */}
        <linearGradient
          id={strokeGradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor={hoverColor} />
          <stop offset="50%" stopColor={hoverColor} />
          <stop offset="100%" stopColor={hoverColor} />
        </linearGradient>

        {/* Cursor-following radial mask */}
        <radialGradient
          id={revealGradientId}
          gradientUnits="userSpaceOnUse"
          cx={maskPosition.cx}
          cy={maskPosition.cy}
          r="26%"
        >
          {hovered ? (
            <>
              <stop offset="0%" stopColor="white" />
              <stop offset="60%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="black" />
              <stop offset="100%" stopColor="black" />
            </>
          )}
        </radialGradient>

        <mask id={maskId}>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${revealGradientId})`}
          />
        </mask>
      </defs>

      {/* Layer 1: Base text (Soft idle state) */}
      <motion.text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={baseColor}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1.2,
          delay: duration,
        }}
        style={{
          fontFamily:
            'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
          fontSize: '150px',
          fontWeight: 900,
          letterSpacing: '-0.055em',
        }}
      >
        {text}
      </motion.text>

      {/* Layer 2: Neon emerald hover layer (follows cursor) */}
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={`url(#${fillGradientId})`}
        stroke={`url(#${strokeGradientId})`}
        strokeWidth="0.8"
        mask={`url(#${maskId})`}
        style={{
          fontFamily:
            'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
          fontSize: '150px',
          fontWeight: 900,
          letterSpacing: '-0.055em',
        }}
      >
        {text}
      </text>
    </svg>
  );
}