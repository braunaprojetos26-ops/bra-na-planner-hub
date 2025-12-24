import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateFunnel } from '@/hooks/useFunnels';

interface NewFunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewFunnelModal({ open, onOpenChange }: NewFunnelModalProps) {
  const [name, setName] = useState('');
  const [autoCreateNext, setAutoCreateNext] = useState(true);
  const [generatesContract, setGeneratesContract] = useState(false);
  const [contractPromptText, setContractPromptText] = useState('');

  const createFunnel = useCreateFunnel();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await createFunnel.mutateAsync({
      name: name.trim(),
      auto_create_next: autoCreateNext,
      generates_contract: generatesContract,
      contract_prompt_text: generatesContract ? contractPromptText : null,
    });

    // Reset form
    setName('');
    setAutoCreateNext(true);
    setGeneratesContract(false);
    setContractPromptText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Funil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Funil</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Prospecção - Planejamento"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoCreateNext"
              checked={autoCreateNext}
              onCheckedChange={checked => setAutoCreateNext(checked as boolean)}
            />
            <Label htmlFor="autoCreateNext" className="cursor-pointer">
              Criar oportunidade automaticamente no próximo funil ao ganhar
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="generatesContract"
              checked={generatesContract}
              onCheckedChange={checked => setGeneratesContract(checked as boolean)}
            />
            <Label htmlFor="generatesContract" className="cursor-pointer">
              Gera contrato ao vencer
            </Label>
          </div>

          {generatesContract && (
            <div className="space-y-2">
              <Label>Texto do Prompt de Contrato</Label>
              <Textarea
                value={contractPromptText}
                onChange={e => setContractPromptText(e.target.value)}
                placeholder="Ex: Parabéns! Complete os dados do contrato..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || createFunnel.isPending}
          >
            {createFunnel.isPending ? 'Criando...' : 'Criar Funil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
