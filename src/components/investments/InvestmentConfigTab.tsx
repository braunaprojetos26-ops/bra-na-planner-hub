import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllInvestmentTicketTypes, useUpdateInvestmentTicketType } from '@/hooks/useInvestmentTicketTypes';
import { useAuth } from '@/contexts/AuthContext';
import { priorityLabels } from '@/types/tickets';
import { Clock, Settings, Save } from 'lucide-react';

export function InvestmentConfigTab() {
  const { role } = useAuth();
  const { data: types = [], isLoading } = useAllInvestmentTicketTypes();
  const updateType = useUpdateInvestmentTicketType();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ sla_minutes: number; default_priority: string }>({ sla_minutes: 60, default_priority: 'normal' });

  const isSuperAdmin = role === 'superadmin';

  const startEdit = (type: any) => {
    setEditingId(type.id);
    setEditValues({ sla_minutes: type.sla_minutes, default_priority: type.default_priority });
  };

  const handleSave = async (id: string) => {
    await updateType.mutateAsync({ id, ...editValues });
    setEditingId(null);
  };

  const formatSla = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">Tipos de Chamado de Investimento</h3>
      </div>

      {!isSuperAdmin && (
        <p className="text-sm text-muted-foreground">Apenas superadministradores podem editar as configurações.</p>
      )}

      <div className="grid gap-4">
        {types.map((type) => (
          <Card key={type.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{type.name}</span>
                      {!type.is_active && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        SLA: {formatSla(type.sla_minutes)}
                      </span>
                      <span>Prioridade: {priorityLabels[type.default_priority as keyof typeof priorityLabels] || type.default_priority}</span>
                      <span>{type.fields_schema.length} campo(s)</span>
                    </div>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-2">
                    {editingId === type.id ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">SLA (min):</Label>
                          <Input
                            type="number"
                            value={editValues.sla_minutes}
                            onChange={(e) => setEditValues(v => ({ ...v, sla_minutes: parseInt(e.target.value) || 0 }))}
                            className="w-20 h-8"
                          />
                        </div>
                        <Select value={editValues.default_priority} onValueChange={(v) => setEditValues(ev => ({ ...ev, default_priority: v }))}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => handleSave(type.id)} disabled={updateType.isPending}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => startEdit(type)}>
                        Editar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
