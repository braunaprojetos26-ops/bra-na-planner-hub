import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, UserPlus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePendingUsers, useApproveUser, useRejectUser } from '@/hooks/useUserApproval';

export function PendingUsersSection() {
  const { data: pendingUsers = [], isLoading } = usePendingUsers();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Usuários Aguardando Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingUsers.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-amber-500" />
          Usuários Aguardando Aprovação
          <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-700">
            {pendingUsers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <div
              key={user.userId}
              className="flex items-center justify-between p-3 rounded-lg bg-background border"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.fullName}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Solicitado em {format(new Date(user.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => approveUser.mutate(user.userId)}
                  disabled={approveUser.isPending || rejectUser.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approveUser.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </>
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={approveUser.isPending || rejectUser.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Rejeitar usuário?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá remover o cadastro de <strong>{user.fullName}</strong> do sistema.
                        O usuário precisará se cadastrar novamente se quiser solicitar acesso.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => rejectUser.mutate(user.userId)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Rejeitar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
