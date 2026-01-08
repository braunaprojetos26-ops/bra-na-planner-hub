import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, MoreHorizontal, Trash2, Image, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useProject, useProjects } from '@/hooks/useProjects';
import { useProjectPages } from '@/hooks/useProjectPages';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useProjectRealtime, useProjectContentSync } from '@/hooks/useProjectRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { ShareProjectModal } from '@/components/projects/ShareProjectModal';
import { OnlineUsers } from '@/components/projects/OnlineUsers';
import { ProjectPropertiesSection } from '@/components/projects/ProjectPropertiesSection';
import { ProjectPagesTable } from '@/components/projects/ProjectPagesTable';
import { NewPageModal } from '@/components/projects/NewPageModal';

const EMOJI_OPTIONS = ['📄', '📋', '📝', '📊', '📈', '💡', '🎯', '🚀', '⭐', '🔥', '💼', '📁'];

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, isLoading } = useProject(projectId);
  const { updateProject, deleteProject } = useProjects();
  const { pages, createPage, updatePage, deletePage, assignUser, unassignUser } = useProjectPages(projectId);
  const { members } = useProjectMembers(projectId);
  const { onlineUsers } = useProjectRealtime(projectId);

  // Filter only accepted members with user_id
  const acceptedMembers = members.filter(m => m.status === 'accepted' && m.user_id);
  
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isOwner = project?.owner_id === user?.id;

  // Handle content updates from other users
  const handleExternalContentUpdate = useCallback((content: unknown[]) => {
    console.log('External content update received');
  }, []);

  useProjectContentSync(projectId, handleExternalContentUpdate);

  const handleTitleChange = async () => {
    if (!projectId || !title.trim()) {
      setIsEditingTitle(false);
      return;
    }
    await updateProject.mutateAsync({ id: projectId, title: title.trim() });
    setIsEditingTitle(false);
  };

  const handleIconChange = async (icon: string) => {
    if (!projectId) return;
    await updateProject.mutateAsync({ id: projectId, icon });
    setShowEmojiPicker(false);
  };

  const handleDelete = async () => {
    if (!projectId) return;
    await deleteProject.mutateAsync(projectId);
    navigate('/projects');
  };

  const handleNewPage = async (data: {
    title: string;
    icon: string;
    status: string;
    priority: string;
    due_date: string | null;
  }) => {
    if (!projectId) return;
    await createPage.mutateAsync({
      project_id: projectId,
      ...data,
    });
    setNewPageOpen(false);
  };

  const handlePageClick = (pageId: string) => {
    navigate(`/projects/${projectId}/pages/${pageId}`);
  };

  const handleUpdatePage = async (pageId: string, data: Partial<{ status: string; priority: string }>) => {
    await updatePage.mutateAsync({ id: pageId, ...data });
  };

  const handleDeletePage = async (pageId: string) => {
    await deletePage.mutateAsync(pageId);
  };

  const handleAssignUser = async (pageId: string, userId: string) => {
    await assignUser.mutateAsync({ pageId, userId });
  };

  const handleUnassignUser = async (pageId: string, userId: string) => {
    await unassignUser.mutateAsync({ pageId, userId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-20 w-20 rounded-lg" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium">Projeto não encontrado</h2>
        <Button variant="link" onClick={() => navigate('/projects')}>
          Voltar para projetos
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Projetos
        </Button>

        <div className="flex items-center gap-3">
          <OnlineUsers users={onlineUsers} />
          
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir projeto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Large Icon */}
      <div className="relative inline-block">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-6xl hover:bg-muted rounded-xl p-3 transition-colors"
        >
          {project.icon}
        </button>
        {showEmojiPicker && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-popover border rounded-xl shadow-lg z-50 flex flex-wrap gap-2 w-64">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleIconChange(emoji)}
                className="text-2xl p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <button className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Image className="h-4 w-4" />
          Adicionar capa
        </button>
        <button className="flex items-center gap-2 hover:text-foreground transition-colors">
          <MessageSquare className="h-4 w-4" />
          Adicionar comentário
        </button>
      </div>

      {/* Title */}
      {isEditingTitle ? (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTitleChange();
            if (e.key === 'Escape') setIsEditingTitle(false);
          }}
          className="text-4xl font-bold h-14 border-0 px-0 focus-visible:ring-0 bg-transparent"
          autoFocus
        />
      ) : (
        <h1 
          className="text-4xl font-bold cursor-pointer hover:bg-muted/50 px-2 py-1 -mx-2 rounded-lg transition-colors"
          onClick={() => {
            setTitle(project.title);
            setIsEditingTitle(true);
          }}
        >
          {project.title}
        </h1>
      )}

      {/* Properties Section */}
      <ProjectPropertiesSection
        owner={{
          full_name: user?.user_metadata?.full_name || user?.email || 'Você',
        }}
        verification={(project as any).verification}
        updatedAt={project.updated_at}
      />

      {/* Sub-pages Table */}
      <ProjectPagesTable
        pages={pages}
        projectMembers={acceptedMembers}
        currentUserId={user?.id || ''}
        onNewPage={() => setNewPageOpen(true)}
        onPageClick={handlePageClick}
        onUpdatePage={handleUpdatePage}
        onDeletePage={handleDeletePage}
        onAssignUser={handleAssignUser}
        onUnassignUser={handleUnassignUser}
      />

      {/* Modals */}
      <NewPageModal
        open={newPageOpen}
        onOpenChange={setNewPageOpen}
        onSubmit={handleNewPage}
        isLoading={createPage.isPending}
      />

      <ShareProjectModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        projectId={project.id}
        projectTitle={project.title}
        ownerId={project.owner_id}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
              onClick={handleDelete}
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
