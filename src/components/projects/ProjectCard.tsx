import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Trash2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/hooks/useProjects';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
  isOwner: boolean;
}

export function ProjectCard({ project, onClick, onDelete, isOwner }: ProjectCardProps) {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
      onClick={onClick}
    >
      {project.cover_url && (
        <div 
          className="h-24 bg-cover bg-center rounded-t-lg"
          style={{ backgroundImage: `url(${project.cover_url})` }}
        />
      )}
      <CardContent className={`p-4 ${!project.cover_url ? 'pt-4' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{project.icon}</span>
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {project.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                Atualizado {format(new Date(project.updated_at), "dd 'de' MMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.is_shared && (
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Compartilhado
              </Badge>
            )}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
