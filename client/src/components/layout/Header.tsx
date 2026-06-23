import React from 'react';
import { Menu } from 'lucide-react';
import { useLayoutContext } from './Layout';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  // onMenuClick is optional now as we use context by default, but kept for compatibility
  onMenuClick?: () => void;
}

export default function Header({ title, subtitle, children, onMenuClick }: HeaderProps) {
  const { openMobileMenu } = useLayoutContext();
  
  const handleMenuClick = onMenuClick || openMobileMenu;

  return (
    <header className="h-16 px-4 md:px-8 border-b border-border-primary bg-surface-primary/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={handleMenuClick}
          className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-sm text-text-muted hidden sm:block mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-4 sm:mt-0">
        {children && (
          <div className="flex items-center gap-3">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
