import React from 'react';

export default function Badge({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-block rounded-full bg-[#0e5b4a] px-2 py-1 text-xs font-semibold text-[#ffaa06] ${className}`}
      {...props}
    />
  );
}
