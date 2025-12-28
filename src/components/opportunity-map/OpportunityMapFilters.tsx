import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlanejadores, useCanViewPlanejadores } from '@/hooks/usePlanejadores';
import { useHierarchy, HierarchyUser } from '@/hooks/useHierarchy';
import { useMemo } from 'react';

interface OpportunityMapFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedOwnerId: string;
  onOwnerChange: (value: string) => void;
  selectedStructure: string;
  onStructureChange: (value: string) => void;
}

export function OpportunityMapFilters({
  searchTerm,
  onSearchChange,
  selectedOwnerId,
  onOwnerChange,
  selectedStructure,
  onStructureChange,
}: OpportunityMapFiltersProps) {
  const canViewPlanejadores = useCanViewPlanejadores();
  const { data: planejadores } = usePlanejadores();
  const { data: hierarchy } = useHierarchy();

  // Extract structure leaders (people who have children in hierarchy)
  const structureLeaders = useMemo(() => {
    if (!hierarchy) return [];

    const leaders: { id: string; name: string; level: number }[] = [];

    const extractLeaders = (nodes: HierarchyUser[], level: number = 0) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          leaders.push({
            id: node.user_id,
            name: node.full_name,
            level,
          });
          extractLeaders(node.children, level + 1);
        }
      });
    };

    extractLeaders(hierarchy);
    return leaders;
  }, [hierarchy]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome do cliente..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {canViewPlanejadores && (
        <>
          <Select value={selectedOwnerId} onValueChange={onOwnerChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por planejador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planejadores</SelectItem>
              {planejadores?.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStructure} onValueChange={onStructureChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por estrutura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as estruturas</SelectItem>
              {structureLeaders.map((leader) => (
                <SelectItem key={leader.id} value={leader.id}>
                  {'—'.repeat(leader.level)} {leader.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
