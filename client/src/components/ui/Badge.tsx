import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  pulse = false,
  className = '',
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-surface-secondary text-text-secondary border border-border-primary',
    success: 'bg-accent-success/10 text-accent-success border border-accent-success/20',
    warning: 'bg-accent-warning/10 text-accent-warning border border-accent-warning/20',
    danger: 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20',
    info: 'bg-accent-info/10 text-accent-info border border-accent-info/20',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  const pulseColors = {
    default: 'bg-text-secondary',
    success: 'bg-accent-success',
    warning: 'bg-accent-warning',
    danger: 'bg-accent-danger',
    info: 'bg-accent-info',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {pulse && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColors[variant]}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColors[variant]}`}></span>
        </span>
      )}
      {children}
    </span>
  );
}
