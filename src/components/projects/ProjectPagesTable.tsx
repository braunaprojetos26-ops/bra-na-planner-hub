import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProjectPageRow } from './ProjectPageRow';
import { ProjectPage } from '@/hooks/useProjectPages';
import { ProjectMember } from '@/hooks/useProjectMembers';

interface ProjectPagesTableProps {
  pages: ProjectPage[];
  projectMembers: ProjectMember[];
  currentUserId: string;
  onNewPage: () => void;
  onPageClick: (pageId: string) => void;
  onUpdatePage: (id: string, data: Partial<ProjectPage>) => void;
  onDeletePage: (id: string) => void;
  onAssignUser: (pageId: string, userId: string) => void;
  onUnassignUser: (pageId: string, userId: string) => void;
}

export function ProjectPagesTable({
  pages,
  projectMembers,
  currentUserId,
  onNewPage,
  onPageClick,
  onUpdatePage,
  onDeletePage,
  onAssignUser,
  onUnassignUser,
}: ProjectPagesTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Projetos</h3>
          <Button variant="ghost" size="sm" onClick={onNewPage}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[300px]">Projeto</TableHead>
            <TableHead className="w-[150px]">Responsáveis</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[120px]">Data Limite</TableHead>
            <TableHead className="w-[100px]">Prioridade</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page) => (
            <ProjectPageRow
              key={page.id}
              page={page}
              projectMembers={projectMembers}
              currentUserId={currentUserId}
              onClick={() => onPageClick(page.id)}
              onUpdate={(data) => onUpdatePage(page.id, data)}
              onDelete={() => onDeletePage(page.id)}
              onAssign={(userId) => onAssignUser(page.id, userId)}
              onUnassign={(userId) => onUnassignUser(page.id, userId)}
            />
          ))}
          {pages.length === 0 && (
            <TableRow>
              <td colSpan={6} className="text-center py-8 text-muted-foreground">
                Nenhuma página criada ainda
              </td>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="px-4 py-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-full justify-start"
          onClick={onNewPage}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova página
        </Button>
      </div>
    </div>
  );
}
