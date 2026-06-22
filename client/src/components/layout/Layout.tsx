import React, { useState, useEffect, createContext, useContext } from 'react';
import Sidebar from './Sidebar';

// Context to allow child components (like Header) to control the mobile sidebar
interface LayoutContextType {
  openMobileMenu: () => void;
}

const LayoutContext = createContext<LayoutContextType>({ openMobileMenu: () => {} });

export const useLayoutContext = () => useContext(LayoutContext);

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Load saved sidebar state
    const saved = localStorage.getItem('petme_sidebar_collapsed');
    if (saved) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const openMobileMenu = () => setIsMobileOpen(true);

  return (
    <LayoutContext.Provider value={{ openMobileMenu }}>
      <div className="min-h-screen bg-surface-primary text-text-primary flex">
        <Sidebar 
          isMobileOpen={isMobileOpen} 
          setIsMobileOpen={setIsMobileOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        
        <div 
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            isCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
          }`}
        >
          {children}
        </div>
      </div>
    </LayoutContext.Provider>
  );
}
