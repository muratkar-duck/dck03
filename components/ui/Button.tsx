import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export default function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary:
      'bg-[#ffaa06] text-[#0e5b4a] hover:bg-[#e6990a] focus:ring-[#0e5b4a]',
    secondary:
      'bg-[#0e5b4a] text-[#ffaa06] hover:bg-[#0b4a3b] focus:ring-[#ffaa06]',
  } as const;
  const variantClass = variants[variant] ?? variants.primary;
  return (
    <button className={`${base} ${variantClass} ${className}`} {...props} />
  );
}
