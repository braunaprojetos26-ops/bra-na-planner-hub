import { Eye, X } from 'lucide-react';
import { useActingUser } from '@/contexts/ActingUserContext';
import { Button } from '@/components/ui/button';

export function ImpersonationBar() {
  const { actingUser, isImpersonating, clearImpersonation } = useActingUser();

  if (!isImpersonating || !actingUser) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-10 bg-warning text-warning-foreground z-50 flex items-center justify-center px-4 shadow-md">
      <div className="flex items-center gap-3">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">
          Modo Visualização: Você está vendo o sistema como{' '}
          <strong>{actingUser.full_name}</strong>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 hover:bg-warning-foreground/10 text-warning-foreground"
          onClick={clearImpersonation}
        >
          <X className="h-4 w-4 mr-1" />
          Encerrar
        </Button>
      </div>
    </div>
  );
}
