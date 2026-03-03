import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type AppView = 'crm' | 'planning';

interface AppViewContextType {
  currentView: AppView;
  switchView: (view: AppView) => void;
}

const AppViewContext = createContext<AppViewContextType | undefined>(undefined);

export function AppViewProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [currentView, setCurrentView] = useState<AppView>(() => {
    // Sync with current route on mount
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/planning')) {
      return 'planning';
    }
    const saved = localStorage.getItem('app-view');
    return (saved === 'planning' ? 'planning' : 'crm') as AppView;
  });

  const switchView = useCallback((view: AppView) => {
    setCurrentView(view);
    localStorage.setItem('app-view', view);
  }, []);

  // Auto-sync view with route
  useEffect(() => {
    const isPlanning = location.pathname.startsWith('/planning');
    if (isPlanning && currentView !== 'planning') {
      setCurrentView('planning');
      localStorage.setItem('app-view', 'planning');
    } else if (!isPlanning && currentView === 'planning') {
      setCurrentView('crm');
      localStorage.setItem('app-view', 'crm');
    }
  }, [location.pathname]);

  return (
    <AppViewContext.Provider value={{ currentView, switchView }}>
      {children}
    </AppViewContext.Provider>
  );
}

export function useAppView() {
  const context = useContext(AppViewContext);
  if (!context) {
    throw new Error('useAppView must be used within an AppViewProvider');
  }
  return context;
}
