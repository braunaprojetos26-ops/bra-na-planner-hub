import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Rocket, 
  ArrowLeft,
  Search,
  User,
} from 'lucide-react';
import braunaLogo from '@/assets/brauna-logo.png';
import { NavLink } from '@/components/NavLink';
import { useAppView } from '@/contexts/AppViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActingUser } from '@/contexts/ActingUserContext';
import { usePlanningClients } from '@/hooks/usePlanningClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useState } from 'react';

const planningNavItems = [
  { title: 'Meu Futuro', path: 'futuro', icon: Rocket },
  // Futuras telas serão adicionadas aqui
];

export function PlanningSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { switchView } = useAppView();
  const { isImpersonating } = useActingUser();
  const { data: clients = [], isLoading } = usePlanningClients();
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.contact_id === clientId);

  const handleBackToCRM = () => {
    switchView('crm');
    navigate('/');
  };

  const handleSelectClient = (contactId: string) => {
    navigate(`/planning/${contactId}/futuro`);
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
        {/* Seleção de cliente */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Cliente
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <ScrollArea className="mt-2 max-h-48">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground p-2">Carregando...</p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Nenhum cliente encontrado</p>
                ) : (
                  <div className="space-y-0.5">
                    {filteredClients.map((client) => (
                      <button
                        key={client.contact_id}
                        onClick={() => handleSelectClient(client.contact_id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                          clientId === client.contact_id
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                        }`}
                      >
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{client.full_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu de navegação do planejamento */}
        {clientId && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Planejamento
              {selectedClient && (
                <span className="block text-[10px] text-sidebar-foreground/40 normal-case tracking-normal mt-0.5">
                  {selectedClient.full_name}
                </span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {planningNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname.includes(`/${item.path}`)}
                    >
                      <NavLink
                        to={`/planning/${clientId}/${item.path}`}
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
          v1.0.0 • Planejamento
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
