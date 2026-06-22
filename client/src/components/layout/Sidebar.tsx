import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  Package, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/income', label: 'Income', icon: TrendingUp },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isMobileOpen, setIsMobileOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
  const location = useLocation();
  const role = localStorage.getItem('userRole') || 'staff';
  const filteredNavItems = role === 'staff' ? navItems.filter(item => item.path !== '/settings') : navItems;

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('petme_sidebar_collapsed', String(newState));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-surface-secondary border-r border-border-primary z-50 transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Header/Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-primary shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-accent-primary" />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold gradient-text whitespace-nowrap">
                PetMe
              </span>
            )}
          </div>
          
          {/* Mobile close button */}
          <button 
            className="md:hidden text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-surface-card transition-colors"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${
                  isActive 
                    ? 'bg-accent-primary/10 text-accent-primary' 
                    : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent-primary rounded-r-full" />
                )}
                
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-accent-primary' : 'text-text-secondary group-hover:text-text-primary transition-colors'}`} />
                
                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer/Toggle */}
        <div className="p-4 border-t border-border-primary shrink-0 flex flex-col gap-4">
          <button 
            onClick={toggleCollapse}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-surface-card border border-border-primary text-text-secondary hover:text-text-primary hover:border-border-hover transition-all mx-auto absolute -right-4 top-20 z-10"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          
          {!isCollapsed && (
            <div className="text-xs text-text-muted text-center">
              Version 1.0
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
