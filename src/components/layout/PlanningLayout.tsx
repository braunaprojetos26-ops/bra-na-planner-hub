import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PlanningSidebar } from './PlanningSidebar';
import { AppHeader } from './AppHeader';
import { ImpersonationBar } from './ImpersonationBar';
import { useActingUser } from '@/contexts/ActingUserContext';

interface PlanningLayoutProps {
  children: ReactNode;
}

export function PlanningLayout({ children }: PlanningLayoutProps) {
  const { isImpersonating } = useActingUser();

  return (
    <SidebarProvider>
      <ImpersonationBar />
      <div className={`min-h-screen flex w-full print:block ${isImpersonating ? 'pt-8' : ''}`}>
        <div className="print:hidden">
          <PlanningSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto print:p-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
