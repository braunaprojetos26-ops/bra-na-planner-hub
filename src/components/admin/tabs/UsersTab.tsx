import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HierarchyTree } from '@/components/structure/HierarchyTree';
import { EditUserModal } from '@/components/structure/EditUserModal';
import { PendingUsersSection } from '@/components/admin/PendingUsersSection';
import { useHierarchy, HierarchyUser, useCanManageStructure } from '@/hooks/useHierarchy';

export function UsersTab() {
  const { data: hierarchy, isLoading } = useHierarchy();
  const canManage = useCanManageStructure();
  
  const [editingUser, setEditingUser] = useState<HierarchyUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditUser = (user: HierarchyUser) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Seção de usuários pendentes - só aparece se houver pendentes */}
      {canManage && <PendingUsersSection />}

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
