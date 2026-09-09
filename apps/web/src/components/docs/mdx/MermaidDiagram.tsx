'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  caption?: string;
}

export function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#0d0d12',
        primaryColor: '#6366f1',
        primaryTextColor: '#f3f4f6',
        primaryBorderColor: '#818cf8',
        lineColor: '#94a3b8',
        secondaryColor: '#10b981',
        tertiaryColor: '#1e1b4b',
        fontFamily: 'inherit',
      },
    });

    const renderChart = async () => {
      if (!chart) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart.trim());
        setSvgContent(svg);
        setHasError(false);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setHasError(true);
      }
    };

    renderChart();
  }, [chart]);

  if (hasError) {
    return (
      <div className="my-6 rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 text-xs font-mono text-rose-300">
        Failed to render diagram.
        <pre className="mt-2 text-zinc-400 overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-xl border border-white/10 bg-[#0d0d12] p-5 shadow-2xl overflow-hidden backdrop-blur-md">
      <div
        ref={containerRef}
        className="overflow-x-auto flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {caption && (
        <p className="mt-3 text-center text-xs font-mono text-zinc-400 border-t border-white/5 pt-2">
          {caption}
        </p>
      )}
    </div>
  );
}
