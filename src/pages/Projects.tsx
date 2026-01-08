import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjects } from '@/hooks/useProjects';
import { usePendingInvites } from '@/hooks/useProjectMembers';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, isLoading, createProject, deleteProject } = useProjects();
  const { pendingInvites, acceptInvite, declineInvite } = usePendingInvites();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const myProjects = projects.filter(p => !p.is_shared);
  const sharedProjects = projects.filter(p => p.is_shared);

  const handleCreateProject = async (data: { title: string; icon: string }) => {
    const result = await createProject.mutateAsync(data);
    setNewProjectOpen(false);
    navigate(`/projects/${result.id}`);
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirm) return;
    await deleteProject.mutateAsync(deleteConfirm);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            Gestão de Projetos
          </h1>
          <p className="text-muted-foreground">
            Crie e colabore em projetos com sua equipe
          </p>
        </div>
        <Button onClick={() => setNewProjectOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Convites Pendentes
              <Badge variant="secondary">{pendingInvites.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite: any) => (
                <div 
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{invite.project?.icon || '📄'}</span>
                    <div>
                      <p className="font-medium">{invite.project?.title || 'Projeto'}</p>
                      <p className="text-sm text-muted-foreground">
                        Você foi convidado como {invite.role === 'viewer' ? 'visualizador' : invite.role === 'editor' ? 'editor' : 'administrador'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => declineInvite.mutate(invite.id)}
                    >
                      Recusar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => acceptInvite.mutate(invite.id)}
                    >
                      Aceitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Tabs */}
      <Tabs defaultValue="my" className="w-full">
        <TabsList>
          <TabsTrigger value="my" className="gap-2">
            <FileText className="h-4 w-4" />
            Meus Projetos
            {myProjects.length > 0 && (
              <Badge variant="secondary" className="ml-1">{myProjects.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Users className="h-4 w-4" />
            Compartilhados Comigo
            {sharedProjects.length > 0 && (
              <Badge variant="secondary" className="ml-1">{sharedProjects.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-muted rounded" />
                        <div className="h-3 w-1/2 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myProjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="text-lg mb-2">Nenhum projeto ainda</CardTitle>
                <CardDescription className="text-center mb-4">
                  Crie seu primeiro projeto para começar a organizar suas ideias
                </CardDescription>
                <Button onClick={() => setNewProjectOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Projeto
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onDelete={() => setDeleteConfirm(project.id)}
                  isOwner={project.owner_id === user?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared" className="mt-6">
          {sharedProjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="text-lg mb-2">Nenhum projeto compartilhado</CardTitle>
                <CardDescription className="text-center">
                  Quando alguém compartilhar um projeto com você, ele aparecerá aqui
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onDelete={() => {}}
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NewProjectModal
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onSubmit={handleCreateProject}
        isLoading={createProject.isPending}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto e todo seu conteúdo serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
