'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function renderMermaid() {
      try {
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'base',
          fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
          themeVariables: {
            fontSize: '14px',
            fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
            textColor: '#17172B',
            lineColor: '#94A3B8',
            mainBkg: '#FFFFFF',
            edgeLabelBackground: '#FFFFFF',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 16,
            nodeSpacing: isMobile ? 35 : 45,
            rankSpacing: isMobile ? 40 : 50,
          },
        });

        const direction = isMobile ? 'TD' : 'LR';

        const chartDefinition = `flowchart ${direction}
    A("Send Event") --> B("Zyvan")
    B --> C("Your Webhook")

    C -->|Works| D("✓ Delivered")
    C -->|Fails| E("Retry")
    E --> C

    classDef send fill:#EEF7FF,stroke:#D6E8F7,color:#17172B,stroke-width:1px;
    classDef zyvan fill:#FFF1E6,stroke:#F5D9C2,color:#17172B,stroke-width:1px;
    classDef webhook fill:#ECFAF2,stroke:#CDEBDD,color:#17172B,stroke-width:1px;
    classDef done fill:#DDF8ED,stroke:#BFEBD7,color:#008F63,stroke-width:1px;
    classDef retry fill:#F1EAFE,stroke:#DDD0F8,color:#17172B,stroke-width:1px;

    class A send;
    class B zyvan;
    class C webhook;
    class D done;
    class E retry;`;

        const uniqueId = `mermaid-how-it-works-${Math.random().toString(36).substring(2, 9)}`;
        const result = await mermaid.render(uniqueId, chartDefinition);
        let svg = result.svg;

        // Ensure nodes have elegant rounded corners (border-radius: 16px)
        svg = svg.replace(/\brx="\d+"/g, 'rx="16"').replace(/\bry="\d+"/g, 'ry="16"');
        svg = svg.replace(/<rect\b(?![^>]*\brx=)/g, '<rect rx="16" ry="16"');

        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.error('Failed to render Mermaid diagram:', err);
      }
    }

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [isMobile]);

  return (
    <section id="how-it-works" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <Badge variant="pill" className="mb-3 px-3 py-1 text-xs text-zinc-600 bg-white border-zinc-200">
            How it works
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#17172B] leading-[1.15]">
            Send it once. Zyvan takes care of the rest.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-zinc-600 leading-relaxed max-w-xl mx-auto">
            Zyvan receives your event, delivers it to your webhook, and automatically retries when something goes wrong.
          </p>
        </div>

        {/* Mermaid Flow Diagram Container: 700-800px visual width */}
        <div className="max-w-[780px] mx-auto">
          <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 sm:p-10 shadow-[0_2px_16px_rgba(0,0,0,0.02)] transition-all">
            <div
              ref={containerRef}
              className="mermaid-wrapper flex items-center justify-center min-h-[180px] w-full overflow-x-auto select-none [&_svg]:max-w-full [&_svg]:h-auto [&_.node_rect]:rx-[18px] [&_.node_rect]:ry-[18px] [&_.node]:font-medium [&_.edgeLabel]:font-mono [&_.edgeLabel]:text-[12px] [&_.edgeLabel]:text-zinc-600 [&_.edgeLabel_rect]:rx-[6px] [&_.edgeLabel_rect]:fill-white/95 [&_.edgeLabel_rect]:stroke-zinc-200/60"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
