import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Network, 
  Kanban, 
  Settings,
  UserCog,
  GraduationCap,
  Bot,
  Building2,
  FileText,
  Package,
  CheckSquare,
  Briefcase,
  BarChart3,
  BookOpen
} from 'lucide-react';
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

const managementNavItems = [
  { title: 'Estrutura', url: '/structure', icon: Network },
];

const adminNavItems = [
  { title: 'Usuários', url: '/admin/users', icon: UserCog },
  { title: 'Pipelines', url: '/admin/pipelines', icon: Settings },
  { title: 'Produtos', url: '/admin/products', icon: Package },
  { title: 'Assistente IA', url: '/admin/assistant', icon: Bot },
];

export function AppSidebar() {
  const location = useLocation();
  const { role } = useAuth();
  const { isImpersonating } = useActingUser();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const canSeeManagement = role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role);
  const canSeeAdmin = role === 'superadmin';

  return (
    <Sidebar className={`border-r border-sidebar-border ${isImpersonating ? 'pt-8' : ''}`}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">Braúna</h1>
            <p className="text-xs text-sidebar-foreground/60">Central do Planejador</p>
          </div>
        </div>
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
