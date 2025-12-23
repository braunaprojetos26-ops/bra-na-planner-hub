import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign } from 'lucide-react';

interface ProposalValueModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (value: number) => void;
    onCancel: () => void;
    contactName?: string;
}

/**
 * Modal to capture the proposal value in Reais.
 * Required when moving a deal to the 'Proposta Feita' stage.
 */
export function ProposalValueModal({
    open,
    onOpenChange,
    onConfirm,
    onCancel,
    contactName,
}: ProposalValueModalProps) {
    const [value, setValue] = useState<string>('');

    const handleConfirm = () => {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue) && numericValue > 0) {
            onConfirm(numericValue);
            setValue('');
        }
    };

    const handleCancel = () => {
        onCancel();
        onOpenChange(false);
        setValue('');
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) handleCancel();
            onOpenChange(isOpen);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Valor da Proposta
                    </DialogTitle>
                    <DialogDescription>
                        Para mover {contactName ? <strong>{contactName}</strong> : 'esta negociação'} para a etapa de Proposta Feita, é obrigatório informar o valor em Reais.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="proposal-value">Valor da Proposta (R$)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                            <Input
                                id="proposal-value"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0,00"
                                className="pl-10"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!value || parseFloat(value) <= 0}
                    >
                        Confirmar e Mover
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
