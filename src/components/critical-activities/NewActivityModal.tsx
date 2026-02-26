import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { positionOptions } from '@/lib/positionLabels';
import { RuleConfigSection } from './RuleConfigSection';
import type { CreateActivityData } from '@/hooks/useCriticalActivities';

interface NewActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateActivityData) => void;
  isSubmitting: boolean;
}

export function NewActivityModal({ open, onOpenChange, onSubmit, isSubmitting }: NewActivityModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [allPositions, setAllPositions] = useState(true);

  // Mode & rule
  const [activityMode, setActivityMode] = useState<'one_time' | 'perpetual'>('one_time');
  const [useRule, setUseRule] = useState(false);
  const [ruleType, setRuleType] = useState('inadimplente');
  const [healthThreshold, setHealthThreshold] = useState('40');
  const [daysBefore, setDaysBefore] = useState('30');

  // Client characteristic
  const [filterType, setFilterType] = useState('product');
  const [filterOperator, setFilterOperator] = useState('has');
  const [filterValue, setFilterValue] = useState('');

  // Perpetual recurrence
  const [perpetualType, setPerpetualType] = useState<'rule' | 'recurrence'>('rule');
  const [recurrenceInterval, setRecurrenceInterval] = useState('daily');

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (activityMode === 'one_time' && !useRule && !deadline) return;

    const data: CreateActivityData = {
      title: title.trim(),
      description: description.trim() || undefined,
      urgency,
      target_positions: allPositions ? null : selectedPositions,
      deadline: activityMode === 'one_time' && !useRule
        ? new Date(deadline).toISOString()
        : activityMode === 'one_time' && useRule
          ? new Date(deadline || Date.now()).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // One-time with rule
    if (activityMode === 'one_time' && useRule) {
      data.rule_type = ruleType;
      data.rule_config = buildRuleConfig();
      data.use_rule = true;
    }

    // Perpetual
    if (activityMode === 'perpetual') {
      data.is_perpetual = true;
      if (perpetualType === 'rule') {
        data.rule_type = ruleType;
        data.rule_config = buildRuleConfig();
      } else {
        data.rule_type = 'manual_recurrence';
        data.recurrence_interval = recurrenceInterval;
      }
    }

    onSubmit(data);
    resetForm();
  };

  const buildRuleConfig = (): Record<string, any> => {
    const config: Record<string, any> = {};
    if (ruleType === 'health_score_critico') {
      config.threshold = parseInt(healthThreshold);
    }
    if (ruleType === 'contrato_vencendo') {
      config.days_before = parseInt(daysBefore);
      config.category_id = 'd770d864-4679-4a6d-9620-6844db224dc3';
    }
    if (ruleType === 'client_characteristic') {
      config.filter_type = filterType;
      config.operator = filterOperator;
      config.value = filterValue;
    }
    return config;
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setUrgency('medium'); setDeadline('');
    setSelectedPositions([]); setAllPositions(true);
    setActivityMode('one_time'); setUseRule(false);
    setRuleType('inadimplente'); setHealthThreshold('40'); setDaysBefore('30');
    setFilterType('product'); setFilterOperator('has'); setFilterValue('');
    setPerpetualType('rule'); setRecurrenceInterval('daily');
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const ruleValid = () => {
    if (ruleType === 'client_characteristic') {
      if (filterType === 'product') return !!filterValue;
      return !!filterValue;
    }
    return true;
  };

  const isValid = title.trim()
    && (activityMode === 'perpetual' || useRule || deadline)
    && (allPositions || selectedPositions.length > 0 || useRule || (activityMode === 'perpetual' && perpetualType === 'rule'))
    && (!useRule || ruleValid())
    && (activityMode !== 'perpetual' || perpetualType !== 'rule' || ruleValid());

  const showPositions = activityMode === 'one_time' ? !useRule : perpetualType === 'recurrence';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Atividade Crítica</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode */}
          <div>
            <Label>Tipo de Atividade</Label>
            <Tabs value={activityMode} onValueChange={(v) => { setActivityMode(v as any); setUseRule(false); }} className="mt-2">
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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* One-time: rule toggle */}
          {activityMode === 'one_time' && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Switch checked={useRule} onCheckedChange={setUseRule} id="use-rule" />
              <label htmlFor="use-rule" className="text-sm font-medium cursor-pointer">
                Distribuir por regra
              </label>
              <span className="text-xs text-muted-foreground">
                (distribui para responsáveis de clientes que atendem a condição)
              </span>
            </div>
          )}

          {/* Deadline for one-time without rule */}
          {activityMode === 'one_time' && !useRule && (
            <div>
              <Label htmlFor="deadline">Data Máxima *</Label>
              <Input id="deadline" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          )}

          {/* Deadline for one-time with rule (optional) */}
          {activityMode === 'one_time' && useRule && (
            <div>
              <Label htmlFor="deadline">Data Máxima (opcional)</Label>
              <Input id="deadline" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Se não definir, a regra será avaliada e as tarefas criadas imediatamente</p>
            </div>
          )}

          {/* One-time rule config */}
          {activityMode === 'one_time' && useRule && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <RuleConfigSection
                ruleType={ruleType} setRuleType={setRuleType}
                healthThreshold={healthThreshold} setHealthThreshold={setHealthThreshold}
                daysBefore={daysBefore} setDaysBefore={setDaysBefore}
                filterType={filterType} setFilterType={setFilterType}
                filterOperator={filterOperator} setFilterOperator={setFilterOperator}
                filterValue={filterValue} setFilterValue={setFilterValue}
              />
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                ⚡ A regra será avaliada uma única vez no momento da criação. Tarefas serão criadas para os responsáveis dos clientes que atendem a condição.
              </p>
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
                <RuleConfigSection
                  ruleType={ruleType} setRuleType={setRuleType}
                  healthThreshold={healthThreshold} setHealthThreshold={setHealthThreshold}
                  daysBefore={daysBefore} setDaysBefore={setDaysBefore}
                  filterType={filterType} setFilterType={setFilterType}
                  filterOperator={filterOperator} setFilterOperator={setFilterOperator}
                  filterValue={filterValue} setFilterValue={setFilterValue}
                />
              )}

              {perpetualType === 'recurrence' && (
                <div>
                  <Label>Frequência de recorrência</Label>
                  <Select value={recurrenceInterval} onValueChange={setRecurrenceInterval}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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

          {/* Positions (only for non-rule distribution) */}
          {showPositions && (
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
          )}
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
