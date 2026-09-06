import React from 'react';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FCFCFD] text-[#0F172A] antialiased">
      {children}
    </div>
  );
}
