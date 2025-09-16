import React from 'react';

export default function Spinner({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-[#0e5b4a] border-t-transparent ${className}`}
      {...props}
    />
  );
}
