import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { ChatAssistant } from '@/components/chat/ChatAssistant';
import { ImpersonationBar } from './ImpersonationBar';
import { useActingUser } from '@/contexts/ActingUserContext';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isImpersonating } = useActingUser();

  return (
    <SidebarProvider>
      <ImpersonationBar />
      <div className={`min-h-screen flex w-full ${isImpersonating ? 'pt-8' : ''}`}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <ChatAssistant />
    </SidebarProvider>
  );
}
