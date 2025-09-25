import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-lg bg-white p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-forest/80">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
      {footer && <div className="pt-2 text-center text-sm text-forest/80">{footer}</div>}
    </div>
  );
}
