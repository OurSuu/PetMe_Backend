import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-surface-input border text-text-primary text-sm rounded-lg transition-colors focus:outline-none focus:ring-1 
              ${icon ? 'pl-10' : 'px-3'} py-2.5 
              ${error 
                ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger' 
                : 'border-border-primary hover:border-border-hover focus:border-accent-primary focus:ring-accent-primary'
              } 
              disabled:opacity-60 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs text-accent-danger mt-0.5">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
