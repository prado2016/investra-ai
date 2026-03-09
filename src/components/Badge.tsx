import type { ReactNode } from 'react';

type BadgeVariant = 'green' | 'red' | 'zinc' | 'indigo' | 'yellow';

const styles: Record<BadgeVariant, string> = {
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  zinc: 'bg-zinc-100 text-zinc-600',
  indigo: 'bg-indigo-50 text-indigo-700',
  yellow: 'bg-yellow-50 text-yellow-700',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'zinc', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
