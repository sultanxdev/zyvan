import React from 'react';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', overflowX: 'hidden' }}>
      {children}
    </div>
  );
}
