import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { positionOptions } from '@/lib/positionLabels';
import type { CreateActivityData } from '@/hooks/useCriticalActivities';

interface NewActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateActivityData) => void;
  isSubmitting: boolean;
}

const RULE_OPTIONS = [
  { value: 'inadimplente', label: 'Cliente Inadimplente', description: 'Quando o contrato do cliente tem pagamento atrasado (Vindi)' },
  { value: 'health_score_critico', label: 'Health Score Crítico', description: 'Quando o Health Score do cliente cai abaixo do limite definido' },
  { value: 'contrato_vencendo', label: 'Contrato Vencendo', description: 'Quando o contrato de Planejamento está próximo do vencimento' },
];

export function NewActivityModal({ open, onOpenChange, onSubmit, isSubmitting }: NewActivityModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [allPositions, setAllPositions] = useState(true);

  // Perpetual fields
  const [activityMode, setActivityMode] = useState<'one_time' | 'perpetual'>('one_time');
  const [perpetualType, setPerpetualType] = useState<'rule' | 'recurrence'>('rule');
  const [ruleType, setRuleType] = useState('inadimplente');
  const [healthThreshold, setHealthThreshold] = useState('40');
  const [daysBefore, setDaysBefore] = useState('30');
  const [recurrenceInterval, setRecurrenceInterval] = useState('daily');

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (activityMode === 'one_time' && !deadline) return;

    const data: CreateActivityData = {
      title: title.trim(),
      description: description.trim() || undefined,
      urgency,
      target_positions: allPositions ? null : selectedPositions,
      deadline: activityMode === 'one_time'
        ? new Date(deadline).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year for perpetual
    };

    if (activityMode === 'perpetual') {
      data.is_perpetual = true;
      if (perpetualType === 'rule') {
        data.rule_type = ruleType;
        data.rule_config = {};
        if (ruleType === 'health_score_critico') {
          data.rule_config.threshold = parseInt(healthThreshold);
        }
        if (ruleType === 'contrato_vencendo') {
          data.rule_config.days_before = parseInt(daysBefore);
          data.rule_config.category_id = 'd770d864-4679-4a6d-9620-6844db224dc3';
        }
      } else {
        data.rule_type = 'manual_recurrence';
        data.recurrence_interval = recurrenceInterval;
      }
    }

    onSubmit(data);
    // Reset
    setTitle('');
    setDescription('');
    setUrgency('medium');
    setDeadline('');
    setSelectedPositions([]);
    setAllPositions(true);
    setActivityMode('one_time');
    setPerpetualType('rule');
    setRuleType('inadimplente');
    setHealthThreshold('40');
    setDaysBefore('30');
    setRecurrenceInterval('daily');
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const isValid = title.trim() && (activityMode === 'perpetual' || deadline) && (allPositions || selectedPositions.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Atividade Crítica</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selection */}
          <div>
            <Label>Tipo de Atividade</Label>
            <Tabs value={activityMode} onValueChange={(v) => setActivityMode(v as any)} className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="one_time">Pontual</TabsTrigger>
                <TabsTrigger value="perpetual">Perpétua</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Avisar cliente inadimplente" />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva a atividade em detalhes..." />
          </div>

          <div>
            <Label>Nível de Urgência</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* One-time: deadline */}
          {activityMode === 'one_time' && (
            <div>
              <Label htmlFor="deadline">Data Máxima *</Label>
              <Input id="deadline" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          )}

          {/* Perpetual config */}
          {activityMode === 'perpetual' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div>
                <Label>Modo perpétuo</Label>
                <Tabs value={perpetualType} onValueChange={(v) => setPerpetualType(v as any)} className="mt-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="rule">Baseada em regra</TabsTrigger>
                    <TabsTrigger value="recurrence">Recorrência fixa</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {perpetualType === 'rule' && (
                <div className="space-y-3">
                  <div>
                    <Label>Regra</Label>
                    <Select value={ruleType} onValueChange={setRuleType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_OPTIONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {RULE_OPTIONS.find(r => r.value === ruleType)?.description}
                    </p>
                  </div>

                  {ruleType === 'health_score_critico' && (
                    <div>
                      <Label htmlFor="threshold">Limite do Health Score</Label>
                      <Input
                        id="threshold"
                        type="number"
                        value={healthThreshold}
                        onChange={e => setHealthThreshold(e.target.value)}
                        min="0"
                        max="100"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Tarefas serão criadas quando o score for menor que este valor</p>
                    </div>
                  )}

                  {ruleType === 'contrato_vencendo' && (
                    <div>
                      <Label htmlFor="daysBefore">Dias antes do vencimento</Label>
                      <Input
                        id="daysBefore"
                        type="number"
                        value={daysBefore}
                        onChange={e => setDaysBefore(e.target.value)}
                        min="1"
                        max="180"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Quantos dias antes do vencimento a tarefa deve ser criada</p>
                    </div>
                  )}
                </div>
              )}

              {perpetualType === 'recurrence' && (
                <div>
                  <Label>Frequência de recorrência</Label>
                  <Select value={recurrenceInterval} onValueChange={setRecurrenceInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                ⚡ Atividades perpétuas são avaliadas automaticamente 1x por dia. Tarefas são criadas apenas quando a condição é detectada e não há tarefa pendente para o mesmo caso.
              </p>
            </div>
          )}

          <div>
            <Label>Destinatários</Label>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox id="all-positions" checked={allPositions} onCheckedChange={(checked) => setAllPositions(!!checked)} />
              <label htmlFor="all-positions" className="text-sm">Todos os cargos</label>
            </div>

            {!allPositions && (
              <div className="grid grid-cols-1 gap-2 mt-3 max-h-48 overflow-y-auto border rounded-md p-3">
                {positionOptions.map(pos => (
                  <div key={pos.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`pos-${pos.value}`}
                      checked={selectedPositions.includes(pos.value)}
                      onCheckedChange={() => togglePosition(pos.value)}
                    />
                    <label htmlFor={`pos-${pos.value}`} className="text-sm">{pos.label}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar Atividade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
