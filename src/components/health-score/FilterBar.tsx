import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { useHierarchy, HierarchyUser } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';

interface FilterBarProps {
  selectedOwnerId?: string;
  onOwnerChange: (ownerId: string | undefined) => void;
}

// Helper to flatten hierarchy tree into a list
function flattenHierarchy(nodes: HierarchyUser[]): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  const traverse = (node: HierarchyUser) => {
    result.push({ id: node.user_id, name: node.full_name });
    node.children.forEach(traverse);
  };
  nodes.forEach(traverse);
  return result;
}

export function FilterBar({ selectedOwnerId, onOwnerChange }: FilterBarProps) {
  const { user, role } = useAuth();
  const { data: hierarchyData } = useHierarchy();
  
  // Flatten hierarchy to get all users as a simple list
  const allUsers = hierarchyData ? flattenHierarchy(hierarchyData) : [];
  
  // Build options list: current user + all visible users
  const ownerOptions = [
    ...(user ? [{ id: user.id, name: 'Minha Carteira' }] : []),
    ...allUsers.filter(u => u.id !== user?.id),
  ];

  const canSeeOthers = role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role);

  const handleClearFilters = () => {
    onOwnerChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canSeeOthers && ownerOptions.length > 1 && (
        <Select
          value={selectedOwnerId || 'all'}
          onValueChange={(value) => onOwnerChange(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por planejador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planejadores</SelectItem>
            {ownerOptions.map(option => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selectedOwnerId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 px-2 text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
