import React from 'react';

export default function Card({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-[#0e5b4a] bg-white p-4 shadow-sm ${className}`}
      {...props}
    />
  );
}
