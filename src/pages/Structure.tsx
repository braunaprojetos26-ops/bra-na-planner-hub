import { useState } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HierarchyTree } from '@/components/structure/HierarchyTree';
import { EditUserModal } from '@/components/structure/EditUserModal';
import { useHierarchy, HierarchyUser, useCanManageStructure } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Structure() {
  const { role } = useAuth();
  const { data: hierarchy, isLoading } = useHierarchy();
  const canManage = useCanManageStructure();
  
  const [editingUser, setEditingUser] = useState<HierarchyUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Check if user has permission to view structure
  const canViewStructure = ['lider', 'supervisor', 'gerente', 'superadmin'].includes(role || '');

  if (!canViewStructure) {
    return <Navigate to="/" replace />;
  }

  const handleEditUser = (user: HierarchyUser) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Estrutura Organizacional</h1>
            <p className="text-muted-foreground">
              Visualize a hierarquia da equipe comercial
            </p>
          </div>
        </div>
      </div>

      {/* Tree Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Árvore Hierárquica</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <HierarchyTree
            roots={hierarchy || []}
            isLoading={isLoading}
            onEditUser={canManage ? handleEditUser : undefined}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {canManage && (
        <EditUserModal
          user={editingUser}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      )}
    </div>
  );
}
