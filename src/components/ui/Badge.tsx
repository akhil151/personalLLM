import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-200',
  success: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
  warning: 'bg-amber-900/30 text-amber-400 border-amber-800',
  danger: 'bg-rose-900/30 text-rose-400 border-rose-800',
  info: 'bg-sky-900/30 text-sky-400 border-sky-800',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
