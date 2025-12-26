import { useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Network, 
  Kanban, 
  Settings,
  GraduationCap,
  FileText,
  CheckSquare,
  Briefcase,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import braunaLogo from '@/assets/brauna-logo.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useActingUser } from '@/contexts/ActingUserContext';
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

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Contatos', url: '/contacts', icon: Users },
  { title: 'Negociações', url: '/pipeline', icon: Kanban },
  { title: 'Clientes', url: '/clients', icon: Briefcase },
  { title: 'Tarefas', url: '/tasks', icon: CheckSquare },
  { title: 'Contratos', url: '/contracts', icon: FileText },
  { title: 'Análises', url: '/analytics', icon: BarChart3 },
  { title: 'Wiki', url: '/wiki', icon: BookOpen },
  { title: 'Treinamentos', url: '/training', icon: GraduationCap },
];

const teamNavItems = [
  { title: 'Equipe', url: '/equipe', icon: Users },
];

const managementNavItems = [
  { title: 'Estrutura', url: '/structure', icon: Network },
];

const adminNavItems = [
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { role } = useAuth();
  const { isImpersonating } = useActingUser();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const canSeeTeam = role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role);
  const canSeeManagement = role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role);
  const canSeeAdmin = role === 'superadmin';

  return (
    <Sidebar className={`border-r border-sidebar-border ${isImpersonating ? 'pt-8' : ''}`}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img 
            src={braunaLogo} 
            alt="Braúna" 
            className="h-10 w-auto"
          />
          <div>
            <h1 className="font-bold text-sidebar-foreground">Braúna</h1>
            <p className="text-xs text-sidebar-foreground/60">Central do Planejador</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {canSeeTeam && teamNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canSeeManagement && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Gestão
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink 
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {canSeeAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink 
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <p className="text-[10px] text-sidebar-foreground/40 text-center">
          v1.0.0 • MVP
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
