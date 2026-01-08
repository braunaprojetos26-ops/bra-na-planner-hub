import { useState } from 'react';
import { Search, Check, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ProjectMember } from '@/hooks/useProjectMembers';

interface Assignee {
  user_id: string;
  profile?: {
    full_name: string;
  };
}

interface AssigneePickerProps {
  assignees: Assignee[] | undefined;
  members: ProjectMember[];
  currentUserId: string;
  onAssign: (userId: string) => void;
  onUnassign: (userId: string) => void;
}

export function AssigneePicker({
  assignees = [],
  members,
  currentUserId,
  onAssign,
  onUnassign,
}: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const assignedUserIds = new Set(assignees.map((a) => a.user_id));

  const filteredMembers = members.filter((member) => {
    if (!member.user_id) return false;
    const name = member.profile?.full_name || member.email || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleToggle = (userId: string) => {
    if (assignedUserIds.has(userId)) {
      onUnassign(userId);
    } else {
      onAssign(userId);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1 py-1 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors min-h-[32px] w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {assignees.length > 0 ? (
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((assignee) => (
                <Avatar
                  key={assignee.user_id}
                  className="h-6 w-6 border-2 border-background"
                >
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {assignee.profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span className="text-sm">Adicionar</span>
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busque pessoas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {filteredMembers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum membro encontrado
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isAssigned = assignedUserIds.has(member.user_id!);
              const isCurrentUser = member.user_id === currentUserId;
              const displayName = member.profile?.full_name || member.email;

              return (
                <button
                  key={member.id}
                  onClick={() => handleToggle(member.user_id!)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-left truncate">
                    {displayName}
                    {isCurrentUser && (
                      <span className="text-muted-foreground ml-1">(você)</span>
                    )}
                  </span>
                  {isAssigned && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
