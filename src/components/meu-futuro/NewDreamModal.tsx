import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dream, DreamCategory, RepetitionType, REPETITION_OPTIONS } from "@/types/dreams";
import { DreamCategorySelector } from "./DreamCategorySelector";

interface NewDreamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dream: Dream) => void;
  editingDream?: Dream | null;
}

export function NewDreamModal({ open, onOpenChange, onSave, editingDream }: NewDreamModalProps) {
  const [category, setCategory] = useState<DreamCategory | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [realizationDate, setRealizationDate] = useState<Date | undefined>(undefined);
  const [totalValue, setTotalValue] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState("");
  const [repetitionType, setRepetitionType] = useState<RepetitionType>("none");
  const [repetitionCount, setRepetitionCount] = useState("");
  const [isPositive, setIsPositive] = useState(false);

  // Reset ou preencher quando abrir
  useEffect(() => {
    if (open) {
      if (editingDream) {
        setCategory(editingDream.category);
        setName(editingDream.name);
        setStartDate(new Date(editingDream.startDate));
        setRealizationDate(new Date(editingDream.realizationDate));
        setTotalValue(editingDream.totalValue.toString());
        setIsInstallment(editingDream.isInstallment);
        setInstallments(editingDream.installments?.toString() || "");
        setRepetitionType(editingDream.repetitionType);
        setRepetitionCount(editingDream.repetitionCount?.toString() || "");
        setIsPositive(editingDream.isPositive);
      } else {
        setCategory(null);
        setName("");
        setStartDate(new Date());
        setRealizationDate(undefined);
        setTotalValue("");
        setIsInstallment(false);
        setInstallments("");
        setRepetitionType("none");
        setRepetitionCount("");
        setIsPositive(false);
      }
    }
  }, [open, editingDream]);

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const amount = parseFloat(numbers) / 100;
    if (isNaN(amount)) return "";
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setTotalValue(formatted);
  };

  const parseValue = (formatted: string): number => {
    const cleaned = formatted.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const handleSave = () => {
    if (!category || !name || !startDate || !realizationDate || !totalValue) {
      return;
    }

    const dream: Dream = {
      id: editingDream?.id || crypto.randomUUID(),
      category,
      name,
      startDate,
      realizationDate,
      totalValue: parseValue(totalValue),
      isInstallment,
      installments: isInstallment ? parseInt(installments) || undefined : undefined,
      repetitionType,
      repetitionCount: repetitionType !== "none" ? parseInt(repetitionCount) || undefined : undefined,
      isPositive,
    };

    onSave(dream);
    onOpenChange(false);
  };

  const isFormValid = category && name && startDate && realizationDate && parseValue(totalValue) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingDream ? "Editar Sonho" : "Adicionar Sonho"}
          </DialogTitle>
          <DialogDescription>
            {editingDream 
              ? "Altere os dados do seu objetivo financeiro" 
              : "Cadastre um novo objetivo para seu planejamento financeiro"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Categoria */}
          <div className="space-y-2">
            <Label>Tipo do objetivo</Label>
            <DreamCategorySelector value={category} onChange={setCategory} />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="dream-name">Nome do objetivo</Label>
            <Input
              id="dream-name"
              placeholder="Ex: Viagem para Europa"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de realização</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !realizationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {realizationDate ? format(realizationDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={realizationDate}
                    onSelect={setRealizationDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="dream-value">Valor total</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                id="dream-value"
                className="pl-10"
                placeholder="0,00"
                value={totalValue}
                onChange={handleValueChange}
              />
            </div>
          </div>

          {/* Parcelado */}
          <div className="space-y-3">
            <Label>Parcelado?</Label>
            <RadioGroup
              value={isInstallment ? "yes" : "no"}
              onValueChange={(v) => setIsInstallment(v === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="installment-no" />
                <Label htmlFor="installment-no" className="font-normal cursor-pointer">
                  Não
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="installment-yes" />
                <Label htmlFor="installment-yes" className="font-normal cursor-pointer">
                  Sim
                </Label>
              </div>
            </RadioGroup>

            {isInstallment && (
              <div className="space-y-2">
                <Label htmlFor="installments-count">Quantidade de parcelas</Label>
                <Input
                  id="installments-count"
                  type="number"
                  min="2"
                  placeholder="12"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Repetição */}
          <div className="space-y-3">
            <Label>Repetição</Label>
            <Select value={repetitionType} onValueChange={(v: RepetitionType) => setRepetitionType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {REPETITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {repetitionType !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="repetition-count">Quantidade de repetições</Label>
                <Input
                  id="repetition-count"
                  type="number"
                  min="1"
                  placeholder="5"
                  value={repetitionCount}
                  onChange={(e) => setRepetitionCount(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tipo de impacto */}
          <div className="space-y-3">
            <Label>Impacto no planejamento</Label>
            <RadioGroup
              value={isPositive ? "positive" : "negative"}
              onValueChange={(v) => setIsPositive(v === "positive")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="negative" id="impact-negative" />
                <Label htmlFor="impact-negative" className="font-normal cursor-pointer text-orange-500">
                  Gasto (-)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="positive" id="impact-positive" />
                <Label htmlFor="impact-positive" className="font-normal cursor-pointer text-emerald-500">
                  Aporte (+)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            {editingDream ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
