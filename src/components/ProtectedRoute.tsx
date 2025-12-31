import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Clock, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, role, loading, profile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is inactive (pending approval or deactivated)
  if (profile && !profile.is_active) {
    // Check if user was ever active (has updated_at different from created_at)
    // If created_at and updated_at are very close, it's a pending user
    const createdAt = new Date(profile.created_at || '').getTime();
    const updatedAt = new Date(profile.updated_at || '').getTime();
    const isPending = Math.abs(updatedAt - createdAt) < 60000; // Less than 1 minute difference

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {isPending ? (
              <>
                <Clock className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                <CardTitle className="text-xl">Aguardando Aprovação</CardTitle>
              </>
            ) : (
              <>
                <UserX className="h-12 w-12 text-destructive mx-auto mb-2" />
                <CardTitle className="text-xl">Acesso Desativado</CardTitle>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {isPending ? (
              <p className="text-muted-foreground">
                Seu cadastro foi recebido e está aguardando aprovação de um administrador.
                Você receberá acesso assim que for aprovado.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Sua conta foi desativada. Entre em contato com um administrador para mais informações.
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full"
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for required roles if specified
  if (requiredRoles && requiredRoles.length > 0) {
    if (!role || !requiredRoles.includes(role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
