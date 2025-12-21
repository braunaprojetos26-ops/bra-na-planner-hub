import { useState } from 'react';
import { ChevronRight, ChevronDown, User, Settings } from 'lucide-react';
import { HierarchyUser, useCanManageStructure } from '@/hooks/useHierarchy';
import { getPositionShort, getPositionLabel } from '@/lib/positionLabels';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HierarchyNodeProps {
  node: HierarchyUser;
  level: number;
  onEditUser?: (user: HierarchyUser) => void;
}

export function HierarchyNode({ node, level, onEditUser }: HierarchyNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const canManage = useCanManageStructure();
  const hasChildren = node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors group",
          level === 0 && "bg-muted/30"
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded hover:bg-muted",
            !hasChildren && "invisible"
          )}
          disabled={!hasChildren}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )
          )}
        </button>

        {/* User icon */}
        <User className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Name */}
        <span className="font-medium text-sm flex-1">{node.full_name}</span>

        {/* Position badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs cursor-help",
                  !node.position && "bg-muted text-muted-foreground"
                )}
              >
                {getPositionShort(node.position)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getPositionLabel(node.position)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Subordinates count */}
        {hasChildren && (
          <span className="text-xs text-muted-foreground">
            ({node.children.length})
          </span>
        )}

        {/* Edit button (admin only) */}
        {canManage && onEditUser && (
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEditUser(node);
            }}
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="border-l border-border/50 ml-5">
          {node.children.map((child) => (
            <HierarchyNode
              key={child.user_id}
              node={child}
              level={level + 1}
              onEditUser={onEditUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
