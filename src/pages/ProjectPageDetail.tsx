import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react';
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
import { useProjectPages } from '@/hooks/useProjectPages';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectEditor } from '@/components/projects/ProjectEditor';
import { PagePropertiesSection } from '@/components/projects/PagePropertiesSection';
import { Json } from '@/integrations/supabase/types';

const EMOJI_OPTIONS = ['📄', '📋', '📝', '📊', '📈', '💡', '🎯', '🚀', '⭐', '🔥', '💼', '📁'];

export default function ProjectPageDetail() {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pages, updatePage, deletePage, assignUser, unassignUser, isLoading } = useProjectPages(projectId);
  const { members } = useProjectMembers(projectId);
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const page = pages.find((p) => p.id === pageId);
  const acceptedMembers = members.filter((m) => m.status === 'accepted' && m.user_id);

  const handleTitleChange = async () => {
    if (!pageId || !title.trim()) {
      setIsEditingTitle(false);
      return;
    }
    await updatePage.mutateAsync({ id: pageId, title: title.trim() });
    setIsEditingTitle(false);
  };

  const handleIconChange = async (icon: string) => {
    if (!pageId) return;
    await updatePage.mutateAsync({ id: pageId, icon });
    setShowEmojiPicker(false);
  };

  const handleContentChange = useCallback(async (content: unknown[]) => {
    if (!pageId) return;
    await updatePage.mutateAsync({ id: pageId, content: content as Json });
  }, [pageId, updatePage]);

  const handlePropertyChange = async (property: string, value: string | null) => {
    if (!pageId) return;
    await updatePage.mutateAsync({ id: pageId, [property]: value });
  };

  const handleAssign = async (userId: string) => {
    if (!pageId) return;
    await assignUser.mutateAsync({ pageId, userId });
  };

  const handleUnassign = async (userId: string) => {
    if (!pageId) return;
    await unassignUser.mutateAsync({ pageId, userId });
  };

  const handleDelete = async () => {
    if (!pageId) return;
    await deletePage.mutateAsync(pageId);
    navigate(`/projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-20 w-20 rounded-lg" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium">Página não encontrada</h2>
        <Button variant="link" onClick={() => navigate(`/projects/${projectId}`)}>
          Voltar para o projeto
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

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
              Excluir página
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Large Icon */}
      <div className="relative inline-block">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-6xl hover:bg-muted rounded-xl p-3 transition-colors"
        >
          {page.icon}
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
            setTitle(page.title);
            setIsEditingTitle(true);
          }}
        >
          {page.title}
        </h1>
      )}

      {/* Properties Section */}
      <PagePropertiesSection
        page={page}
        members={acceptedMembers}
        currentUserId={user?.id || ''}
        onUpdate={handlePropertyChange}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
      />

      {/* Editor */}
      <div className="border rounded-lg bg-background min-h-[500px]">
        <ProjectEditor
          initialContent={page.content as unknown[]}
          onChange={handleContentChange}
          editable={true}
        />
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A página e todo seu conteúdo serão permanentemente excluídos.
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
