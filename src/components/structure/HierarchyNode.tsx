import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, User, Settings, Shield } from 'lucide-react';
import { HierarchyUser, useCanManageStructure } from '@/hooks/useHierarchy';
import { getPositionShort, getPositionLabel } from '@/lib/positionLabels';
import { getRoleLabel, getRoleBadgeVariant } from '@/lib/roleLabels';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useActingUser } from '@/contexts/ActingUserContext';

interface HierarchyNodeProps {
  node: HierarchyUser;
  level: number;
  onEditUser?: (user: HierarchyUser) => void;
}

export function HierarchyNode({ node, level, onEditUser }: HierarchyNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const canManage = useCanManageStructure();
  const hasChildren = node.children.length > 0;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActingUser } = useActingUser();

  // User can impersonate subordinates (anyone in their tree except themselves)
  const isOwnProfile = user?.id === node.user_id;

  const handleImpersonate = () => {
    if (isOwnProfile) return;
    
    setActingUser({
      id: node.user_id,
      full_name: node.full_name,
      email: node.email,
    });
    navigate('/');
  };

  // Check if user has elevated role
  const hasElevatedRole = node.role && ['lider', 'supervisor', 'gerente', 'superadmin'].includes(node.role);

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

        {/* Name - clickable for impersonation if not own profile */}
        {isOwnProfile ? (
          <span className="font-medium text-sm flex-1">{node.full_name}</span>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleImpersonate}
                  className="font-medium text-sm flex-1 text-left text-primary hover:underline cursor-pointer"
                >
                  {node.full_name}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Visualizar como {node.full_name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Role badge (for elevated roles) */}
        {hasElevatedRole && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={getRoleBadgeVariant(node.role)}
                  className="text-xs cursor-help gap-1"
                >
                  <Shield className="w-3 h-3" />
                  {getRoleLabel(node.role)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Papel no sistema: {getRoleLabel(node.role)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Position badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs cursor-help",
                  !node.position && "bg-muted text-muted-foreground"
                )}
              >
                {getPositionShort(node.position)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cargo: {getPositionLabel(node.position)}</p>
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
