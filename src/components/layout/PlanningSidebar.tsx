import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Rocket, 
  ArrowLeft,
  Users,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import braunaLogo from '@/assets/brauna-logo.png';
import { NavLink } from '@/components/NavLink';
import { useAppView } from '@/contexts/AppViewContext';
import { useActingUser } from '@/contexts/ActingUserContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';

const planningNavItems = [
  { title: 'Clientes', path: '/planning', icon: Users, exact: true },
  { title: 'Meu Futuro', path: 'futuro', icon: Rocket, requiresClient: true },
  { title: 'Orçamento', path: 'orcamento', icon: DollarSign, requiresClient: true },
  { title: 'Reserva de Emergência', path: 'reserva', icon: ShieldCheck, requiresClient: true },
];

export function PlanningSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { switchView } = useAppView();
  const { isImpersonating } = useActingUser();

  const handleBackToCRM = () => {
    switchView('crm');
    navigate('/');
  };

  return (
    <Sidebar className={`border-r border-sidebar-border ${isImpersonating ? 'pt-8' : ''}`}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={braunaLogo} alt="Braúna" className="h-10 w-auto" />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sidebar-foreground text-sm">Braúna</h1>
            <p className="text-xs text-sidebar-foreground/60">Montagem de Planejamento</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleBackToCRM}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar à Central
        </Button>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Planejamento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {planningNavItems.map((item) => {
                // Skip client-dependent items when no client is selected
                if (item.requiresClient && !clientId) return null;

                const fullPath = item.exact
                  ? item.path
                  : `/planning/${clientId}/${item.path}`;

                const isActive = item.exact
                  ? location.pathname === '/planning'
                  : location.pathname.includes(`/${item.path}`);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={fullPath}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <p className="text-[10px] text-sidebar-foreground/40 text-center">
          v1.0.0 • Planejamento
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
