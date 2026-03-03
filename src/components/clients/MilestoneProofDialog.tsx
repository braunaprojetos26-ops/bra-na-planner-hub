import { useState, useRef } from 'react';
import { Upload, FileText, Image, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateMilestoneProof } from '@/hooks/useMilestoneProofs';
import { useUpdateMilestone, GoalMilestone } from '@/hooks/useClientGoals';
import { toast } from 'sonner';

interface MilestoneProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: GoalMilestone;
  contactId: string;
}

export function MilestoneProofDialog({ open, onOpenChange, milestone, contactId }: MilestoneProofDialogProps) {
  const [proofType, setProofType] = useState<'text' | 'image' | 'file'>('text');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProof = useCreateMilestoneProof();
  const updateMilestone = useUpdateMilestone();

  const reset = () => {
    setProofType('text');
    setTextContent('');
    setFile(null);
  };

  const handleSubmit = async () => {
    if (proofType === 'text' && !textContent.trim()) {
      toast.error('Insira a descrição da comprovação');
      return;
    }
    if ((proofType === 'image' || proofType === 'file') && !file) {
      toast.error('Selecione um arquivo para comprovação');
      return;
    }

    try {
      await createProof.mutateAsync({
        milestoneId: milestone.id,
        contactId,
        proofType,
        textContent: textContent.trim() || undefined,
        file: file || undefined,
      });

      await updateMilestone.mutateAsync({
        id: milestone.id,
        contactId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      toast.success('Marco concluído com comprovação!');
      reset();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao concluir marco');
    }
  };

  const isSubmitting = createProof.isPending || updateMilestone.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir Marco</DialogTitle>
          <DialogDescription>
            Comprove a conclusão do marco: <strong>{milestone.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={proofType} onValueChange={(v) => setProofType(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1 gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Texto
            </TabsTrigger>
            <TabsTrigger value="image" className="flex-1 gap-1.5">
              <Image className="h-3.5 w-3.5" />
              Imagem
            </TabsTrigger>
            <TabsTrigger value="file" className="flex-1 gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Arquivo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-2 mt-3">
            <Label>Descrição da comprovação</Label>
            <Textarea
              placeholder="Descreva como o marco foi alcançado..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={4}
            />
          </TabsContent>

          <TabsContent value="image" className="space-y-2 mt-3">
            <Label>Imagem de comprovação</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar imagem
              </Button>
            )}
          </TabsContent>

          <TabsContent value="file" className="space-y-2 mt-3">
            <Label>Arquivo de comprovação</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar arquivo
              </Button>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Concluir Marco'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
