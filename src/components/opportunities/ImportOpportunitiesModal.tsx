import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useImportOpportunities } from '@/hooks/useImportOpportunities';

interface ImportOpportunitiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedOpportunity {
  _rowNumber: number;
  _errors: string[];
  _isValid: boolean;
  // Raw values for display
  _phoneName: string;
  _funnelName: string;
  _stageName: string;
  // Matched IDs
  contact_id?: string;
  contact_name?: string;
  current_funnel_id?: string;
  current_stage_id?: string;
  qualification?: number;
  temperature?: string;
  proposal_value?: number;
  notes?: string;
}

const TEMPERATURE_MAP: Record<string, string> = {
  'frio': 'cold',
  'morno': 'warm',
  'quente': 'hot',
  'cold': 'cold',
  'warm': 'warm',
  'hot': 'hot',
};

const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export function ImportOpportunitiesModal({ open, onOpenChange }: ImportOpportunitiesModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedOpportunity[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const importOpportunities = useImportOpportunities();

  const resetModal = useCallback(() => {
    setStep('upload');
    setParsedRows([]);
    setImportResult(null);
    setIsProcessing(false);
  }, []);

  const handleClose = useCallback((openState: boolean) => {
    if (!openState) resetModal();
    onOpenChange(openState);
  }, [onOpenChange, resetModal]);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);

    try {
      // Fetch all contacts, funnels, and stages in parallel
      const [contactsRes, funnelsRes, stagesRes] = await Promise.all([
        supabase.from('contacts').select('id, full_name, phone'),
        supabase.from('funnels').select('id, name').eq('is_active', true),
        supabase.from('funnel_stages').select('id, name, funnel_id').order('order_position'),
      ]);

      const contacts = contactsRes.data || [];
      const funnels = funnelsRes.data || [];
      const stages = stagesRes.data || [];

      // Build phone lookup map (normalized phone -> contact)
      const phoneMap = new Map<string, { id: string; full_name: string }>();
      for (const c of contacts) {
        const normalized = normalizePhone(c.phone);
        if (normalized) phoneMap.set(normalized, { id: c.id, full_name: c.full_name });
      }

      // Build funnel name lookup (lowercase -> funnel)
      const funnelMap = new Map<string, { id: string; name: string }>();
      for (const f of funnels) {
        funnelMap.set(f.name.toLowerCase().trim(), { id: f.id, name: f.name });
      }

      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      const rows: ParsedOpportunity[] = jsonData.map((row, index) => {
        const rowNumber = index + 2;
        const errors: string[] = [];

        const rawPhone = String(row['Telefone do Contato'] || '').trim();
        const rawFunnel = String(row['Funil'] || '').trim();
        const rawStage = String(row['Etapa'] || '').trim();

        // Match contact by phone
        const normalizedPhone = normalizePhone(rawPhone);
        const matchedContact = normalizedPhone ? phoneMap.get(normalizedPhone) : undefined;
        if (!rawPhone) {
          errors.push('Telefone é obrigatório');
        } else if (!matchedContact) {
          errors.push('Contato não encontrado');
        }

        // Match funnel
        const matchedFunnel = rawFunnel ? funnelMap.get(rawFunnel.toLowerCase().trim()) : undefined;
        if (!rawFunnel) {
          errors.push('Funil é obrigatório');
        } else if (!matchedFunnel) {
          errors.push('Funil não encontrado');
        }

        // Match stage within funnel
        let matchedStage: { id: string; name: string } | undefined;
        if (matchedFunnel && rawStage) {
          const funnelStages = stages.filter(s => s.funnel_id === matchedFunnel.id);
          const found = funnelStages.find(s => s.name.toLowerCase().trim() === rawStage.toLowerCase().trim());
          if (found) {
            matchedStage = { id: found.id, name: found.name };
          } else {
            errors.push('Etapa não encontrada neste funil');
          }
        } else if (!rawStage) {
          errors.push('Etapa é obrigatória');
        }

        // Parse optional fields
        let qualification: number | undefined;
        const rawQual = row['Qualificação'] || row['Qualificacao'];
        if (rawQual !== undefined && rawQual !== '') {
          const q = parseInt(String(rawQual));
          if (q >= 1 && q <= 5) qualification = q;
        }

        let temperature: string | undefined;
        const rawTemp = String(row['Temperatura'] || '').trim().toLowerCase();
        if (rawTemp && TEMPERATURE_MAP[rawTemp]) {
          temperature = TEMPERATURE_MAP[rawTemp];
        }

        let proposalValue: number | undefined;
        const rawValue = row['Valor da Proposta'];
        if (rawValue !== undefined && rawValue !== '') {
          const num = parseFloat(String(rawValue).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(num)) proposalValue = num;
        }

        const notes = row['Anotações'] || row['Anotacoes'] || undefined;

        return {
          _rowNumber: rowNumber,
          _errors: errors,
          _isValid: errors.length === 0,
          _phoneName: rawPhone,
          _funnelName: rawFunnel,
          _stageName: rawStage,
          contact_id: matchedContact?.id,
          contact_name: matchedContact?.full_name,
          current_funnel_id: matchedFunnel?.id,
          current_stage_id: matchedStage?.id,
          qualification,
          temperature,
          proposal_value: proposalValue,
          notes: notes ? String(notes) : undefined,
        };
      });

      setParsedRows(rows);
      setStep('preview');
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const downloadTemplate = useCallback(() => {
    const headers = [
      'Telefone do Contato',
      'Funil',
      'Etapa',
      'Qualificação',
      'Temperatura',
      'Valor da Proposta',
      'Anotações',
    ];
    const exampleRow = {
      'Telefone do Contato': '(11) 99999-9999',
      'Funil': 'PROSPECÇÃO - PLANEJAMENTO',
      'Etapa': 'Lead Recebido',
      'Qualificação': '3',
      'Temperatura': 'Morno',
      'Valor da Proposta': '5000',
      'Anotações': 'Cliente indicado',
    };

    const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Negociações');
    XLSX.writeFile(wb, 'modelo-importacao-negociacoes.xlsx');
  }, []);

  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) return;

    const toImport = validRows.map(r => ({
      contact_id: r.contact_id!,
      current_funnel_id: r.current_funnel_id!,
      current_stage_id: r.current_stage_id!,
      qualification: r.qualification,
      temperature: r.temperature,
      notes: r.notes,
      proposal_value: r.proposal_value,
      _rowNumber: r._rowNumber,
    }));

    const result = await importOpportunities.mutateAsync(toImport);
    setImportResult(result);
    setStep('result');
  }, [parsedRows, importOpportunities]);

  const validCount = parsedRows.filter(r => r._isValid).length;
  const invalidCount = parsedRows.filter(r => !r._isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Negociações
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de uma planilha com os dados das negociações. Os contatos serão vinculados pelo telefone.'}
            {step === 'preview' && 'Revise os dados antes de confirmar a importação.'}
            {step === 'result' && 'Resultado da importação.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {isProcessing ? 'Processando arquivo...' : 'Arraste e solte sua planilha aqui'}
              </p>
              {!isProcessing && (
                <>
                  <p className="text-sm text-muted-foreground mb-4">ou</p>
                  <label>
                    <Button variant="outline" asChild>
                      <span>
                        Selecionar arquivo
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </span>
                    </Button>
                  </label>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                Formatos aceitos: .xlsx, .xls, .csv
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Baixar modelo de planilha</p>
                <p className="text-sm text-muted-foreground">
                  Use o modelo para garantir que os dados estejam no formato correto
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Baixar modelo
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {validCount} válida(s)
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {invalidCount} com erro(s)
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Linha</TableHead>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Funil</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow key={row._rowNumber} className={!row._isValid ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-muted-foreground">{row._rowNumber}</TableCell>
                      <TableCell>
                        {row._isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.contact_name || row._phoneName || '-'}
                      </TableCell>
                      <TableCell>{row._funnelName || '-'}</TableCell>
                      <TableCell>{row._stageName || '-'}</TableCell>
                      <TableCell>
                        {row.proposal_value
                          ? row.proposal_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {row._errors.length > 0 && (
                          <span className="text-sm text-destructive">
                            {row._errors.join(', ')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || importOpportunities.isPending}
              >
                {importOpportunities.isPending
                  ? 'Importando...'
                  : `Importar ${validCount} negociação(ões)`}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            <div className="p-6 bg-muted/50 rounded-lg text-center">
              {importResult.failed === 0 ? (
                <>
                  <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Importação concluída!</h3>
                  <p className="text-muted-foreground">
                    {importResult.success} negociação(ões) importada(s) com sucesso.
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 mx-auto text-yellow-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Importação parcial</h3>
                  <p className="text-muted-foreground">
                    {importResult.success} sucesso(s), {importResult.failed} erro(s)
                  </p>
                </>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <ScrollArea className="max-h-[200px] border rounded-lg p-4">
                <h4 className="font-medium mb-2">Erros encontrados:</h4>
                <ul className="space-y-1 text-sm">
                  {importResult.errors.map((err, idx) => (
                    <li key={idx} className="text-destructive">
                      Linha {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => handleClose(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
