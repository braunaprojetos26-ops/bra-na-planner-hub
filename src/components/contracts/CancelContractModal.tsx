import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { differenceInMonths } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCancellationReasons } from "@/hooks/useChurnAnalytics";
import { AlertTriangle, Loader2 } from "lucide-react";

interface CancelContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
    id: string;
    contract_value: number;
    start_date?: string | null;
    meeting_count?: number | null;
  };
  lastCompletedMeeting?: number;
}

export function CancelContractModal({
  open,
  onOpenChange,
  contract,
  lastCompletedMeeting = 0,
}: CancelContractModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: reasons } = useCancellationReasons();

  const [reasonId, setReasonId] = useState<string>("");
  const [reasonDetails, setReasonDetails] = useState("");

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      // Calculate contract month
      let contractMonth: number | null = null;
      if (contract.start_date) {
        contractMonth = differenceInMonths(new Date(), new Date(contract.start_date)) + 1;
      }

      // Update contract status
      const { error: contractError } = await supabase
        .from("contracts")
        .update({ status: "cancelled" })
        .eq("id", contract.id);

      if (contractError) throw contractError;

      // Create cancellation record
      const { error: cancellationError } = await supabase
        .from("contract_cancellations")
        .insert({
          contract_id: contract.id,
          cancelled_by: user.id,
          reason_id: reasonId || null,
          reason_details: reasonDetails || null,
          contract_month: contractMonth,
          last_completed_meeting: lastCompletedMeeting,
          total_meetings_planned: contract.meeting_count || null,
          contract_value: contract.contract_value,
        });

      if (cancellationError) throw cancellationError;
    },
    onSuccess: () => {
      toast.success("Contrato cancelado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["churn-analytics"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error cancelling contract:", error);
      toast.error("Erro ao cancelar contrato");
    },
  });

  const resetForm = () => {
    setReasonId("");
    setReasonDetails("");
  };

  const handleCancel = () => {
    cancelMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Contrato
          </DialogTitle>
          <DialogDescription>
            Esta ação irá marcar o contrato como cancelado e registrar os motivos para análise de
            churn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Cancelamento</Label>
            <Select value={reasonId} onValueChange={setReasonId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo principal" />
              </SelectTrigger>
              <SelectContent>
                {reasons?.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detalhes Adicionais (opcional)</Label>
            <Textarea
              id="details"
              placeholder="Descreva mais detalhes sobre o cancelamento..."
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <p>
              <strong>Valor do contrato:</strong>{" "}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(contract.contract_value)}
            </p>
            {lastCompletedMeeting > 0 && (
              <p>
                <strong>Última reunião realizada:</strong> {lastCompletedMeeting}ª reunião
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
