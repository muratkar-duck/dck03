import React from 'react';

interface ErrorStateProps {
  message: string;
  children?: React.ReactNode;
}

export default function ErrorState({ message, children }: ErrorStateProps) {
  return (
    <div className="rounded-md border border-[#ffaa06] bg-[#ffaa06]/20 p-4 text-center text-[#0e5b4a]">
      <p className="mb-4 font-semibold">{message}</p>
      {children}
    </div>
  );
}
