import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
import { CLIENT_PLAN_MEETING_THEMES } from '@/types/clients';
import { toast } from 'sonner';

interface ImportClientDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  _rowNumber: number;
  _errors: string[];
  _isValid: boolean;
  _clientCode: string;
  _clientName: string;
  _planejadorEmail: string;
  // Matched data
  contact_id?: string;
  plan_id?: string;
  owner_id?: string;
  total_meetings?: 4 | 6 | 9 | 12;
  current_meeting?: number;
  themes: string[];
  products: string[];
  product_ids: string[];
  product_values: number[];
}

const VALID_TOTAL_MEETINGS = [4, 6, 9, 12];
const THEMES_LIST = [...CLIENT_PLAN_MEETING_THEMES];

export function ImportClientDataModal({ open, onOpenChange }: ImportClientDataModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
      // Fetch contacts with client_code, existing plans, products, and profiles
      const [contactsRes, plansRes, productsRes, profilesRes] = await Promise.all([
        supabase.from('contacts').select('id, full_name, client_code'),
        supabase.from('client_plans').select('id, contact_id, total_meetings, status').eq('status', 'active'),
        supabase.from('products').select('id, name, partner_name').eq('is_active', true),
        supabase.from('profiles').select('user_id, full_name, email').eq('is_active', true),
      ]);

      const contacts = contactsRes.data || [];
      const plans = plansRes.data || [];
      const products = productsRes.data || [];
      const profiles = profilesRes.data || [];
      // Build lookups
      const codeMap = new Map<string, { id: string; full_name: string }>();
      for (const c of contacts) {
        if (c.client_code) {
          codeMap.set(c.client_code.toUpperCase().trim(), { id: c.id, full_name: c.full_name });
        }
      }

      const planByContact = new Map<string, { id: string; total_meetings: number }>();
      for (const p of plans) {
        planByContact.set(p.contact_id, { id: p.id, total_meetings: p.total_meetings });
      }

      // Build email lookup for profiles
      const emailMap = new Map<string, string>();
      for (const p of profiles) {
        if (p.email) emailMap.set(p.email.toLowerCase().trim(), p.user_id);
      }

      // Build product display name: "Name (Partner)" when partner exists
      const getProductDisplayName = (p: { name: string; partner_name: string | null }) =>
        p.partner_name ? `${p.name} (${p.partner_name})` : p.name;

      const productMap = new Map<string, string>(); // display name lowercase -> id
      for (const p of products) {
        const displayName = getProductDisplayName(p);
        productMap.set(displayName.toLowerCase().trim(), p.id);
        // Also map by name alone if there's no ambiguity (no other product with same name)
        const sameName = products.filter(x => x.name.toLowerCase().trim() === p.name.toLowerCase().trim());
        if (sameName.length === 1) {
          productMap.set(p.name.toLowerCase().trim(), p.id);
        }
      }

      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      const rows: ParsedRow[] = jsonData.map((row, index) => {
        const rowNumber = index + 2;
        const errors: string[] = [];

        const rawCode = String(row['Código do Cliente'] || row['Codigo do Cliente'] || '').trim().toUpperCase();
        const rawName = String(row['Nome do Cliente'] || '').trim();
        const rawTotalMeetings = row['Nº Reuniões Contratadas'] || row['N Reunioes Contratadas'] || row['Total Reuniões'] || '';
        const rawCurrentMeeting = row['Reunião Atual'] || row['Reuniao Atual'] || '';
        const rawPlanejador = String(row['Planejador (Email)'] || '').trim().toLowerCase();

        // Match contact
        const matchedContact = rawCode ? codeMap.get(rawCode) : undefined;
        if (!rawCode) {
          errors.push('Código do cliente é obrigatório');
        } else if (!matchedContact) {
          errors.push(`Cliente "${rawCode}" não encontrado`);
        }

        // Validate total meetings
        let totalMeetings: 4 | 6 | 9 | 12 | undefined;
        if (rawTotalMeetings !== '' && rawTotalMeetings !== undefined) {
          const num = parseInt(String(rawTotalMeetings));
          if (VALID_TOTAL_MEETINGS.includes(num)) {
            totalMeetings = num as 4 | 6 | 9 | 12;
          } else {
            errors.push(`Nº reuniões inválido: "${rawTotalMeetings}". Use: 4, 6, 9 ou 12`);
          }
        }

        // Validate current meeting
        let currentMeeting: number | undefined;
        if (rawCurrentMeeting !== '' && rawCurrentMeeting !== undefined) {
          const num = parseInt(String(rawCurrentMeeting));
          const max = totalMeetings || 12;
          if (num >= 1 && num <= max) {
            currentMeeting = num;
          } else {
            errors.push(`Reunião atual inválida: "${rawCurrentMeeting}"`);
          }
        }

        // Parse themes (Tema 1 ... Tema 12)
        const themes: string[] = [];
        for (let i = 1; i <= 12; i++) {
          const rawTheme = String(row[`Tema Reunião ${i}`] || row[`Tema Reuniao ${i}`] || '').trim();
          if (rawTheme) {
            const matched = THEMES_LIST.find(t => t.toLowerCase() === rawTheme.toLowerCase());
            if (matched) {
              themes.push(matched);
            } else {
              errors.push(`Tema ${i} inválido: "${rawTheme}"`);
            }
          } else {
            themes.push('');
          }
        }

        // Parse products (Produto 1 ... Produto 5) and their values
        const productNames: string[] = [];
        const productIds: string[] = [];
        const productValues: number[] = [];
        for (let i = 1; i <= 5; i++) {
          const rawProduct = String(row[`Produto ${i}`] || '').trim();
          if (rawProduct) {
            const pid = productMap.get(rawProduct.toLowerCase().trim());
            if (pid) {
              productNames.push(rawProduct);
              productIds.push(pid);
              const rawValue = row[`Valor Produto ${i}`] || row[`Valor R$ Produto ${i}`] || 0;
              const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
              productValues.push(numValue);
            } else {
              errors.push(`Produto ${i} não encontrado: "${rawProduct}"`);
            }
          }
        }

        // Check existing plan
        const existingPlan = matchedContact ? planByContact.get(matchedContact.id) : undefined;

        // Match planner by email
        let ownerId: string | undefined;
        if (rawPlanejador) {
          const matchedOwner = emailMap.get(rawPlanejador);
          if (matchedOwner) {
            ownerId = matchedOwner;
          } else {
            errors.push(`Planejador "${rawPlanejador}" não encontrado`);
          }
        }

        return {
          _rowNumber: rowNumber,
          _errors: errors,
          _isValid: errors.length === 0,
          _clientCode: rawCode,
          _clientName: matchedContact?.full_name || rawName,
          _planejadorEmail: rawPlanejador,
          contact_id: matchedContact?.id,
          plan_id: existingPlan?.id,
          owner_id: ownerId,
          total_meetings: totalMeetings,
          current_meeting: currentMeeting,
          themes,
          products: productNames,
          product_ids: productIds,
          product_values: productValues,
        };
      });

      setParsedRows(rows);
      setStep('preview');
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar arquivo');
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

  const downloadTemplate = useCallback(async () => {
    // Fetch products and profiles for reference sheet
    const [{ data: products }, { data: profiles }] = await Promise.all([
      supabase.from('products').select('name, partner_name').eq('is_active', true).order('name'),
      supabase.from('profiles').select('email').eq('is_active', true).order('full_name'),
    ]);

    // Build display names for products
    const productDisplayNames = (products || []).map(p =>
      p.partner_name ? `${p.name} (${p.partner_name})` : p.name
    );

    const headers = [
      'Código do Cliente',
      'Nome do Cliente',
      'Planejador (Email)',
      'Nº Reuniões Contratadas',
      'Reunião Atual',
      ...Array.from({ length: 12 }, (_, i) => `Tema Reunião ${i + 1}`),
      ...Array.from({ length: 5 }, (_, i) => [`Produto ${i + 1}`, `Valor R$ Produto ${i + 1}`]).flat(),
    ];

    const exampleRow: Record<string, string> = {
      'Código do Cliente': 'C000001',
      'Nome do Cliente': 'João Silva (referência)',
      'Planejador (Email)': 'planejador@email.com',
      'Nº Reuniões Contratadas': '12',
      'Reunião Atual': '3',
      'Tema Reunião 1': 'Planejamento Macro',
      'Tema Reunião 2': 'Gestão de Riscos',
      'Tema Reunião 3': 'Investimentos',
      'Tema Reunião 4': '',
      'Tema Reunião 5': '',
      'Tema Reunião 6': '',
      'Tema Reunião 7': '',
      'Tema Reunião 8': '',
      'Tema Reunião 9': '',
      'Tema Reunião 10': '',
      'Tema Reunião 11': '',
      'Tema Reunião 12': '',
      'Produto 1': 'Planejamento Financeiro Completo (Braúna)',
      'Valor R$ Produto 1': '10000',
      'Produto 2': 'Icatu Horizonte (Icatu)',
      'Valor R$ Produto 2': '2500',
      'Produto 3': 'Consórcio Imobiliário - Parcela Cheia (Embracon)',
      'Valor R$ Produto 3': '200000',
      'Produto 4': '',
      'Valor R$ Produto 4': '',
      'Produto 5': '',
      'Valor R$ Produto 5': '',
    };

    const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 20) }));

    // Create reference sheet with valid options
    const profileEmails = (profiles || []).map(p => p.email).filter(Boolean) as string[];
    const maxRows = Math.max(THEMES_LIST.length, productDisplayNames.length, VALID_TOTAL_MEETINGS.length, profileEmails.length);
    const refData: Record<string, string>[] = [];
    for (let i = 0; i < maxRows; i++) {
      refData.push({
        'Temas de Reunião Válidos': THEMES_LIST[i] || '',
        'Nº Reuniões Válidos': VALID_TOTAL_MEETINGS[i]?.toString() || '',
        'Produtos Válidos': productDisplayNames[i] || '',
        'Planejadores (Email)': profileEmails[i] || '',
      });
    }
    const wsRef = XLSX.utils.json_to_sheet(refData);
    wsRef['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 50 }, { wch: 35 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados dos Clientes');
    XLSX.utils.book_append_sheet(wb, wsRef, 'Valores Válidos');
    XLSX.writeFile(wb, 'modelo-atualizacao-clientes.xlsx');
  }, []);

  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) return;

    setStep('importing');
    let success = 0;
    let failed = 0;
    const errors: Array<{ row: number; error: string }> = [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    for (const row of validRows) {
      try {
        if (!row.contact_id || !row.total_meetings) {
          errors.push({ row: row._rowNumber, error: 'Dados obrigatórios ausentes' });
          failed++;
          continue;
        }

        // Update contact owner if planner specified
        if (row.owner_id && row.contact_id) {
          await supabase.from('contacts').update({ owner_id: row.owner_id }).eq('id', row.contact_id);
        }

        // Check if plan already exists
        if (row.plan_id) {
          // Update existing plan
          const { error: planError } = await supabase
            .from('client_plans')
            .update({ total_meetings: row.total_meetings })
            .eq('id', row.plan_id);

          if (planError) throw planError;

          // Delete old meetings and recreate
          await supabase
            .from('client_plan_meetings')
            .delete()
            .eq('plan_id', row.plan_id);

          // Create new meetings
          const meetings = [];
          for (let i = 0; i < row.total_meetings; i++) {
            const theme = row.themes[i] || 'Acompanhamento';
            const isCompleted = row.current_meeting ? (i + 1) < row.current_meeting : false;
            meetings.push({
              plan_id: row.plan_id,
              meeting_number: i + 1,
              theme,
              scheduled_date: new Date().toISOString().split('T')[0], // placeholder
              status: isCompleted ? 'completed' : (i + 1 === row.current_meeting ? 'scheduled' : 'pending'),
              completed_at: isCompleted ? new Date().toISOString() : null,
            });
          }

          if (meetings.length > 0) {
            const { error: meetingsError } = await supabase
              .from('client_plan_meetings')
              .insert(meetings);
            if (meetingsError) throw meetingsError;
          }
        } else {
          // Create new plan
          const startDate = new Date().toISOString().split('T')[0];
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);

          const { data: newPlan, error: planError } = await supabase
            .from('client_plans')
            .insert({
              contact_id: row.contact_id,
              owner_id: row.owner_id || user.id,
              created_by: user.id,
              contract_value: 0,
              total_meetings: row.total_meetings,
              start_date: startDate,
              end_date: endDate.toISOString().split('T')[0],
              status: 'active',
            })
            .select('id')
            .single();

          if (planError) throw planError;

          // Create meetings
          const meetings = [];
          for (let i = 0; i < row.total_meetings; i++) {
            const theme = row.themes[i] || 'Acompanhamento';
            const isCompleted = row.current_meeting ? (i + 1) < row.current_meeting : false;
            meetings.push({
              plan_id: newPlan.id,
              meeting_number: i + 1,
              theme,
              scheduled_date: startDate,
              status: isCompleted ? 'completed' : (i + 1 === row.current_meeting ? 'scheduled' : 'pending'),
              completed_at: isCompleted ? new Date().toISOString() : null,
            });
          }

          if (meetings.length > 0) {
            const { error: meetingsError } = await supabase
              .from('client_plan_meetings')
              .insert(meetings);
            if (meetingsError) throw meetingsError;
          }
        }

        // Handle products - create contracts for each product if not already existing
        if (row.product_ids.length > 0) {
          // Check existing contracts for this contact
          const { data: existingContracts } = await supabase
            .from('contracts')
            .select('product_id')
            .eq('contact_id', row.contact_id)
            .in('status', ['active', 'pending']);

          const existingProductIds = new Set(existingContracts?.map(c => c.product_id) || []);

          for (let pi = 0; pi < row.product_ids.length; pi++) {
            const productId = row.product_ids[pi];
            const contractValue = row.product_values[pi] || 0;
            if (!existingProductIds.has(productId)) {
              await supabase.from('contracts').insert({
                contact_id: row.contact_id,
                owner_id: row.owner_id || user.id,
                product_id: productId,
                contract_value: contractValue,
                calculated_pbs: 0,
                status: 'active',
                notes: 'Importado via planilha de atualização',
              });
            }
          }
        }

        success++;
      } catch (err: any) {
        failed++;
        errors.push({ row: row._rowNumber, error: err.message || 'Erro desconhecido' });
      }
    }

    setImportResult({ success, failed, errors });
    setStep('result');
  }, [parsedRows]);

  const validCount = parsedRows.filter(r => r._isValid).length;
  const invalidCount = parsedRows.filter(r => !r._isValid).length;

  return (
    <Dialog open={open} onOpenChange={step === 'importing' ? undefined : handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Atualizar Dados de Clientes
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Importe uma planilha para atualizar reuniões e produtos dos clientes. Os clientes são identificados pelo código.'}
            {step === 'preview' && 'Revise os dados antes de confirmar a importação.'}
            {step === 'importing' && 'Importando dados... Não feche esta janela.'}
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
              <p className="text-xs text-muted-foreground mt-4">Formatos aceitos: .xlsx, .xls, .csv</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Baixar modelo de planilha</p>
                <p className="text-sm text-muted-foreground">
                  Inclui aba "Valores Válidos" com todos os temas e produtos aceitos
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Baixar modelo
              </Button>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm space-y-1">
              <p className="font-medium text-blue-700">ℹ️ Instruções importantes:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>Preencha o <strong>Código do Cliente</strong> exatamente como aparece no sistema (ex: C000001)</li>
                <li>Os temas de reunião devem ser copiados exatamente da aba "Valores Válidos"</li>
                <li>Os nomes dos produtos devem corresponder exatamente aos cadastrados</li>
                <li>Nº de reuniões aceitos: 4, 6, 9 ou 12</li>
                <li>Se o cliente já possui um plano ativo, ele será atualizado</li>
                <li>Coluna <strong>Planejador (Email)</strong>: e-mail do planejador responsável (opcional, veja aba "Valores Válidos")</li>
              </ul>
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
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Reuniões</TableHead>
                    <TableHead className="text-center">Atual</TableHead>
                    <TableHead className="text-center">Produtos</TableHead>
                    <TableHead>Plano</TableHead>
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
                      <TableCell className="font-mono text-xs">{row._clientCode}</TableCell>
                      <TableCell className="font-medium truncate max-w-[150px]">{row._clientName}</TableCell>
                      <TableCell className="text-center">{row.total_meetings || '-'}</TableCell>
                      <TableCell className="text-center">{row.current_meeting || '-'}</TableCell>
                      <TableCell className="text-center">{row.products.length || '-'}</TableCell>
                      <TableCell>
                        {row.plan_id ? (
                          <Badge variant="secondary" className="text-xs">Atualizar</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Criar novo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row._errors.length > 0 && (
                          <span className="text-xs text-destructive">
                            {row._errors.join('; ')}
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
              <Button onClick={handleImport} disabled={validCount === 0}>
                Importar {validCount} cliente(s)
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Processando importação...</p>
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
                    {importResult.success} cliente(s) atualizado(s) com sucesso.
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
