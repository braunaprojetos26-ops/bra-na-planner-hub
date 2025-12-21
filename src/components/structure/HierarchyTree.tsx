import { HierarchyUser } from '@/hooks/useHierarchy';
import { HierarchyNode } from './HierarchyNode';
import { Skeleton } from '@/components/ui/skeleton';

interface HierarchyTreeProps {
  roots: HierarchyUser[];
  isLoading: boolean;
  onEditUser?: (user: HierarchyUser) => void;
}

export function HierarchyTree({ roots, isLoading, onEditUser }: HierarchyTreeProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="ml-6 space-y-2">
              <Skeleton className="h-8 w-[90%]" />
              <Skeleton className="h-8 w-[85%]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum usuário encontrado na estrutura.</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      {roots.map((root) => (
        <HierarchyNode
          key={root.user_id}
          node={root}
          level={0}
          onEditUser={onEditUser}
        />
      ))}
    </div>
  );
}
