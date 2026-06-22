import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'metric' | 'glass';
  icon?: React.ReactNode;
  trend?: { value: number; positive: boolean };
  accentColor?: 'primary' | 'success' | 'warning' | 'danger';
  headerAction?: React.ReactNode;
}

export default function Card({
  title,
  subtitle,
  children,
  className = '',
  variant = 'default',
  icon,
  trend,
  accentColor,
  headerAction,
}: CardProps) {
  const baseClasses = 'relative rounded-xl overflow-hidden transition-all duration-300';
  
  const variantClasses = {
    default: 'bg-surface-card shadow-card hover:shadow-card-hover border border-border-primary hover:border-border-hover card-gradient-border',
    metric: 'bg-surface-card shadow-card hover:shadow-card-hover border border-border-primary hover:border-border-hover',
    glass: 'glass hover:glass-strong shadow-card',
  };

  const getAccentColorClass = () => {
    switch (accentColor) {
      case 'primary': return 'text-accent-primary';
      case 'success': return 'text-accent-success';
      case 'warning': return 'text-accent-warning';
      case 'danger': return 'text-accent-danger';
      default: return 'text-text-primary';
    }
  };

  if (variant === 'metric') {
    return (
      <div className={`${baseClasses} ${variantClasses[variant]} p-5 ${className}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-sm font-medium text-text-muted mb-1">{title}</h3>}
            <div className={`text-2xl font-bold animate-count-up ${getAccentColorClass()}`}>
              {children}
            </div>
          </div>
          {icon && (
            <div className={`p-2 rounded-lg bg-surface-primary/50 border border-border-primary ${getAccentColorClass()}`}>
              {icon}
            </div>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-border-primary/50 text-sm">
            <span className={trend.positive ? 'text-accent-success' : 'text-accent-danger'}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-text-muted">vs last period</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {(title || subtitle || icon || headerAction) && (
        <div className="p-5 border-b border-border-primary/50 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-text-primary">{title}</h3>}
            {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {icon && <div className="text-text-secondary">{icon}</div>}
            {headerAction && <div>{headerAction}</div>}
          </div>
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
