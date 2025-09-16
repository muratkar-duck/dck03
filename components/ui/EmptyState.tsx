import React from 'react';

interface EmptyStateProps {
  message: string;
  children?: React.ReactNode;
}

export default function EmptyState({ message, children }: EmptyStateProps) {
  return (
    <div className="text-center text-[#0e5b4a]">
      <p className="mb-4">{message}</p>
      {children}
    </div>
  );
}
