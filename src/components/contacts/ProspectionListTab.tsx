import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, PhoneOff, ArrowRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProspectionList, useRemoveFromProspectionList } from '@/hooks/useProspectionList';
import { useState } from 'react';

interface RemoveDialogState {
  contactId: string;
  contactName: string;
  reason: 'negotiation_started' | 'no_contact';
}

export function ProspectionListTab() {
  const navigate = useNavigate();
  const { data: prospectionList, isLoading } = useProspectionList();
  const removeFromList = useRemoveFromProspectionList();
  const [removeDialog, setRemoveDialog] = useState<RemoveDialogState | null>(null);

  const handleRemove = async () => {
    if (!removeDialog) return;
    
    await removeFromList.mutateAsync({
      contactId: removeDialog.contactId,
      reason: removeDialog.reason,
    });
    setRemoveDialog(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Carregando lista de prospecção...</p>
      </div>
    );
  }

  if (!prospectionList || prospectionList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <Phone className="w-12 h-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Nenhum contato na lista de prospecção</p>
        <p className="text-sm text-muted-foreground">
          Selecione contatos na aba "Todos os Contatos" e adicione à lista
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead className="min-w-[180px]">E-mail</TableHead>
            <TableHead>Adicionado em</TableHead>
            <TableHead className="text-center min-w-[280px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prospectionList.map(item => (
            <TableRow key={item.id}>
              <TableCell className="min-w-[200px]">
                <div className="flex flex-col">
                  <span className="font-medium">{item.contact?.full_name}</span>
                  {item.contact?.qualification && (
                    <span className="text-yellow-500 text-xs">
                      {'⭐'.repeat(item.contact.qualification)}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">{item.contact?.phone}</TableCell>
              <TableCell className="text-sm min-w-[180px]">
                {item.contact?.email || '-'}
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(item.added_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/contacts/${item.contact_id}`)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700"
                    onClick={() => setRemoveDialog({
                      contactId: item.contact_id,
                      contactName: item.contact?.full_name || '',
                      reason: 'negotiation_started',
                    })}
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Negociação Iniciada
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setRemoveDialog({
                      contactId: item.contact_id,
                      contactName: item.contact?.full_name || '',
                      reason: 'no_contact',
                    })}
                  >
                    <PhoneOff className="w-3 h-3 mr-1" />
                    Não foi possível
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!removeDialog} onOpenChange={(open) => !open && setRemoveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeDialog?.reason === 'negotiation_started' 
                ? 'Confirmar Negociação Iniciada' 
                : 'Confirmar Remoção'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeDialog?.reason === 'negotiation_started' ? (
                <>
                  Confirma que a negociação com <strong>{removeDialog?.contactName}</strong> foi iniciada?
                  O contato será removido da Lista de Prospecção.
                </>
              ) : (
                <>
                  Confirma que não foi possível contatar <strong>{removeDialog?.contactName}</strong>?
                  O contato será removido da Lista de Prospecção.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemove}
              className={removeDialog?.reason === 'negotiation_started' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-destructive hover:bg-destructive/90'}
            >
              {removeFromList.isPending ? 'Removendo...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
