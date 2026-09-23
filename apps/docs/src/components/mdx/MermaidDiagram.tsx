'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  caption?: string;
}

export function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chart) return;
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            darkMode: true,
            background: '#0B0D0C',
            primaryColor: '#22C55E',
            primaryTextColor: '#F4F4F5',
            primaryBorderColor: '#1B241F',
            lineColor: '#22C55E',
            secondaryColor: '#101412',
            tertiaryColor: '#070908',
            fontFamily: 'inherit',
          },
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
          setHasError(false);
        }
      } catch (err) {
        if (isMounted) {
          setHasError(true);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (hasError || !svgContent) {
    return (
      <div className="my-6 rounded-lg border border-[#1B241F] bg-[#070908] p-4 text-xs font-mono text-zinc-400 overflow-x-auto">
        <pre className="text-zinc-400">{chart.trim()}</pre>
        {caption && <p className="mt-2 text-[11px] text-zinc-500 italic">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg border border-[#1B241F] bg-[#070908] p-5 overflow-hidden font-mono">
      <div
        ref={containerRef}
        className="overflow-x-auto flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {caption && (
        <p className="mt-3 text-center text-xs font-mono text-zinc-500 border-t border-[#141A17] pt-2">
          {caption}
        </p>
      )}
    </div>
  );
}
