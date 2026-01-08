import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, MoreHorizontal, Trash2 } from 'lucide-react';
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
import { useProjectRealtime, useProjectContentSync } from '@/hooks/useProjectRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectEditor } from '@/components/projects/ProjectEditor';
import { ShareProjectModal } from '@/components/projects/ShareProjectModal';
import { OnlineUsers } from '@/components/projects/OnlineUsers';

const EMOJI_OPTIONS = ['📄', '📋', '📝', '📊', '📈', '💡', '🎯', '🚀', '⭐', '🔥', '💼', '📁'];

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, isLoading, updateContent } = useProject(projectId);
  const { updateProject, deleteProject } = useProjects();
  const { onlineUsers } = useProjectRealtime(projectId);
  
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isOwner = project?.owner_id === user?.id;

  // Handle content updates from other users
  const handleExternalContentUpdate = useCallback((content: unknown[]) => {
    // The editor would need to handle this externally
    // For now, we'll rely on page refresh for full sync
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

  const handleContentChange = async (content: unknown[]) => {
    await updateContent.mutateAsync(content);
  };

  const handleDelete = async () => {
    if (!projectId) return;
    await deleteProject.mutateAsync(projectId);
    navigate('/projects');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[500px] w-full" />
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Icon Picker */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-3xl hover:bg-muted rounded-lg p-1 transition-colors"
            >
              {project.icon}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-popover border rounded-lg shadow-lg z-50 flex flex-wrap gap-1 w-48">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleIconChange(emoji)}
                    className="text-xl p-1 hover:bg-muted rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
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
              className="text-xl font-semibold h-10 w-64"
              autoFocus
            />
          ) : (
            <h1 
              className="text-xl font-semibold cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors"
              onClick={() => {
                setTitle(project.title);
                setIsEditingTitle(true);
              }}
            >
              {project.title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <OnlineUsers users={onlineUsers} />
          
          <Button variant="outline" onClick={() => setShareOpen(true)}>
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

      {/* Editor */}
      <div className="border rounded-lg bg-background">
        <ProjectEditor
          initialContent={project.content as unknown[]}
          onChange={handleContentChange}
          editable={true}
        />
      </div>

      {/* Modals */}
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
