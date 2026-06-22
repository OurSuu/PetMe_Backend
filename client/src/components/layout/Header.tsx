import React, { useState } from 'react';
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
  const [role, setRole] = useState(() => localStorage.getItem('userRole') || 'owner');
  
  const handleMenuClick = onMenuClick || openMobileMenu;

  const handleToggleRole = () => {
    const newRole = role === 'owner' ? 'staff' : 'owner';
    localStorage.setItem('userRole', newRole);
    setRole(newRole);
    window.location.reload();
  };

  return (
    <header className={`h-16 px-4 md:px-8 border-b border-border-primary bg-surface-primary/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between ${role === 'staff' ? 'border-b-accent-warning border-b-2' : ''}`}>
      {role === 'staff' && (
        <div className="absolute top-full left-0 w-full bg-accent-warning text-bg-primary text-xs font-bold text-center py-0.5 z-40 shadow-sm">
          STAFF MODE - VIEW ONLY
        </div>
      )}
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
        <button 
          onClick={handleToggleRole}
          className="px-3 py-1.5 text-xs font-medium rounded border border-border-primary bg-surface-card hover:bg-surface-secondary transition-colors"
          title="Simulate Auth Role Switch"
        >
          Role: <span className={role === 'owner' ? 'text-accent-primary' : 'text-accent-warning'}>{role.toUpperCase()}</span>
        </button>
        {children && (
          <div className="flex items-center gap-3">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
