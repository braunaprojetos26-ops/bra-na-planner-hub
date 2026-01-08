import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Crown, Mail } from 'lucide-react';
import { useProjectMembers, type ProjectMember } from '@/hooks/useProjectMembers';

interface ShareProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  ownerId: string;
}

const roleLabels = {
  viewer: 'Visualizador',
  editor: 'Editor',
  admin: 'Administrador',
};

export function ShareProjectModal({ 
  open, 
  onOpenChange, 
  projectId, 
  projectTitle,
  ownerId 
}: ShareProjectModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor' | 'admin'>('editor');
  const { members, inviteMember, updateMemberRole, removeMember } = useProjectMembers(projectId);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    await inviteMember.mutateAsync({ email: email.trim(), role });
    setEmail('');
  };

  const acceptedMembers = members.filter(m => m.status === 'accepted');
  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Compartilhar "{projectTitle}"
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Digite o email do colaborador..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Visualizador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviteMember.isPending || !email.trim()}>
              Convidar
            </Button>
          </div>
        </form>

        <div className="space-y-4 mt-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Pessoas com acesso
            </h4>
            <div className="space-y-2">
              {/* Owner */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Crown className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">Proprietário</p>
                    <p className="text-xs text-muted-foreground">Acesso total</p>
                  </div>
                </div>
                <Badge variant="secondary">Dono</Badge>
              </div>

              {/* Accepted Members */}
              {acceptedMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onRoleChange={(newRole) => 
                    updateMemberRole.mutate({ memberId: member.id, role: newRole })
                  }
                  onRemove={() => removeMember.mutate(member.id)}
                />
              ))}
            </div>
          </div>

          {pendingMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Convites pendentes
              </h4>
              <div className="space-y-2">
                {pendingMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-dashed"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Mail className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">{member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Aguardando aceitar convite
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{roleLabels[member.role]}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeMember.mutate(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ 
  member, 
  onRoleChange, 
  onRemove 
}: { 
  member: ProjectMember;
  onRoleChange: (role: 'viewer' | 'editor' | 'admin') => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          {member.profile?.avatar_url && (
            <AvatarImage src={member.profile.avatar_url} />
          )}
          <AvatarFallback>
            {member.profile?.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            {member.profile?.full_name || member.email}
          </p>
          {member.profile?.full_name && (
            <p className="text-xs text-muted-foreground">{member.email}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={member.role} onValueChange={onRoleChange}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Visualizador</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
