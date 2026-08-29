import React from 'react';

export default function Container({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 ${className}`}>
      {children}
    </div>
  );
}
