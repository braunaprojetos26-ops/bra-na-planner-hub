import { Navigate } from 'react-router-dom';
import { Settings, Users, Kanban, Package, ClipboardList, Sparkles, UsersRound, Heart, Target, Globe, ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { UsersTab, PipelinesTab, AITab, TeamManagementTab, HealthScoreTab, GoalsTab, RemoteConfigTab, DashboardBannerTab } from '@/components/admin/tabs';
import AdminProducts from './AdminProducts';
import AdminDataCollectionBuilder from './AdminDataCollectionBuilder';

type SettingsTab = 'users' | 'pipelines' | 'products' | 'data-collection' | 'ai' | 'team-management' | 'health-score' | 'goals' | 'remote-config' | 'dashboard-banner';

interface AdminSettingsProps {
  defaultTab?: SettingsTab;
}

export default function AdminSettings({ defaultTab = 'users' }: AdminSettingsProps) {
  const { role } = useAuth();

  if (role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie usuários, pipelines, produtos e configurações de IA
          </p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="w-full flex justify-between">
          <TabsTrigger value="users" className="flex-1 gap-2">
            <Users className="h-4 w-4 hidden sm:inline" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="flex-1 gap-2">
            <Kanban className="h-4 w-4 hidden sm:inline" />
            Funis
          </TabsTrigger>
          <TabsTrigger value="products" className="flex-1 gap-2">
            <Package className="h-4 w-4 hidden sm:inline" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="data-collection" className="flex-1 gap-2">
            <ClipboardList className="h-4 w-4 hidden sm:inline" />
            Coleta de Dados
          </TabsTrigger>
          <TabsTrigger value="team-management" className="flex-1 gap-2">
            <UsersRound className="h-4 w-4 hidden sm:inline" />
            Gestão de Equipe
          </TabsTrigger>
          <TabsTrigger value="health-score" className="flex-1 gap-2">
            <Heart className="h-4 w-4 hidden sm:inline" />
            Health Score
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex-1 gap-2">
            <Target className="h-4 w-4 hidden sm:inline" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1 gap-2">
            <Sparkles className="h-4 w-4 hidden sm:inline" />
            IA
          </TabsTrigger>
          <TabsTrigger value="remote-config" className="flex-1 gap-2">
            <Globe className="h-4 w-4 hidden sm:inline" />
            Extensão
          </TabsTrigger>
          <TabsTrigger value="dashboard-banner" className="flex-1 gap-2">
            <ImageIcon className="h-4 w-4 hidden sm:inline" />
            Banner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="pipelines">
          <PipelinesTab />
        </TabsContent>

        <TabsContent value="products" className="space-y-0">
          <AdminProductsContent />
        </TabsContent>

        <TabsContent value="data-collection" className="space-y-0">
          <AdminDataCollectionContent />
        </TabsContent>

        <TabsContent value="team-management">
          <TeamManagementTab />
        </TabsContent>

        <TabsContent value="health-score">
          <HealthScoreTab />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>

        <TabsContent value="ai">
          <AITab />
        </TabsContent>

        <TabsContent value="remote-config">
          <RemoteConfigTab />
        </TabsContent>

        <TabsContent value="dashboard-banner">
          <DashboardBannerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Wrapper components to remove the outer container from the original pages
function AdminProductsContent() {
  return (
    <div className="-mx-6 -my-6">
      <AdminProducts />
    </div>
  );
}

function AdminDataCollectionContent() {
  return (
    <div className="-mx-6 -my-6">
      <AdminDataCollectionBuilder />
    </div>
  );
}
