import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
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
import { useImportContacts } from '@/hooks/useImportContacts';
import type { ContactFormData, ContactTemperature } from '@/types/contacts';

interface ImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedContact extends Partial<ContactFormData> {
  _rowNumber: number;
  _errors: string[];
  _isValid: boolean;
}

const COLUMN_MAPPING: Record<string, keyof ContactFormData> = {
  'Nome Completo': 'full_name',
  'Telefone': 'phone',
  'E-mail': 'email',
  'CPF': 'cpf',
  'RG': 'rg',
  'Órgão Emissor RG': 'rg_issuer',
  'Data Emissão RG': 'rg_issue_date',
  'Data de Nascimento': 'birth_date',
  'Gênero': 'gender',
  'Estado Civil': 'marital_status',
  'Profissão': 'profession',
  'Renda Mensal': 'income',
  'CEP': 'zip_code',
  'Endereço': 'address',
  'Número': 'address_number',
  'Complemento': 'address_complement',
  'Origem': 'source',
  'Detalhe da Origem': 'source_detail',
  'Campanha': 'campaign',
  'Qualificação': 'qualification',
  'Temperatura': 'temperature',
  'Anotações': 'notes',
};

const GENDER_MAP: Record<string, string> = {
  'masculino': 'masculino',
  'feminino': 'feminino',
  'outro': 'outro',
  'prefiro não informar': 'prefiro_nao_informar',
  'm': 'masculino',
  'f': 'feminino',
};

const MARITAL_STATUS_MAP: Record<string, string> = {
  'solteiro': 'solteiro',
  'solteira': 'solteiro',
  'casado': 'casado',
  'casada': 'casado',
  'divorciado': 'divorciado',
  'divorciada': 'divorciado',
  'viúvo': 'viuvo',
  'viúva': 'viuvo',
  'viuvo': 'viuvo',
  'viuva': 'viuvo',
  'união estável': 'uniao_estavel',
  'uniao estavel': 'uniao_estavel',
};

const TEMPERATURE_MAP: Record<string, ContactTemperature> = {
  'frio': 'cold',
  'morno': 'warm',
  'quente': 'hot',
  'cold': 'cold',
  'warm': 'warm',
  'hot': 'hot',
};

export function ImportContactsModal({ open, onOpenChange }: ImportContactsModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: Array<{ row: number; error: string }> } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const importContacts = useImportContacts();

  const resetModal = useCallback(() => {
    setStep('upload');
    setParsedContacts([]);
    setImportResult(null);
  }, []);

  const handleClose = useCallback((openState: boolean) => {
    if (!openState) {
      resetModal();
    }
    onOpenChange(openState);
  }, [onOpenChange, resetModal]);

  const parseDate = (value: any): string | undefined => {
    if (!value) return undefined;
    
    // Handle Excel serial dates
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        const year = date.y;
        const month = String(date.m).padStart(2, '0');
        const day = String(date.d).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    // Handle string dates
    if (typeof value === 'string') {
      // Try DD/MM/YYYY format
      const brMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (brMatch) {
        const [, day, month, year] = brMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try YYYY-MM-DD format
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        return value;
      }
    }
    
    return undefined;
  };

  const parseRow = (row: Record<string, any>, rowNumber: number): ParsedContact => {
    const contact: ParsedContact = {
      _rowNumber: rowNumber,
      _errors: [],
      _isValid: true,
    };

    for (const [columnName, fieldName] of Object.entries(COLUMN_MAPPING)) {
      const rawValue = row[columnName];
      
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        continue;
      }

      const value = String(rawValue).trim();

      switch (fieldName) {
        case 'full_name':
          contact.full_name = value;
          break;
        case 'phone':
          contact.phone = value.replace(/\D/g, '').length >= 10 
            ? value 
            : value.replace(/\D/g, '');
          break;
        case 'email':
          if (value.includes('@')) {
            contact.email = value;
          } else if (value) {
            contact._errors.push('E-mail inválido');
          }
          break;
        case 'income':
          const numValue = parseFloat(String(rawValue).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(numValue)) {
            contact.income = numValue;
          }
          break;
        case 'qualification':
          const qualValue = parseInt(String(rawValue));
          if (qualValue >= 1 && qualValue <= 5) {
            contact.qualification = qualValue;
          }
          break;
        case 'gender':
          const normalizedGender = value.toLowerCase();
          contact.gender = GENDER_MAP[normalizedGender] || value;
          break;
        case 'marital_status':
          const normalizedMarital = value.toLowerCase();
          contact.marital_status = MARITAL_STATUS_MAP[normalizedMarital] || value;
          break;
        case 'temperature':
          const normalizedTemp = value.toLowerCase();
          contact.temperature = TEMPERATURE_MAP[normalizedTemp];
          break;
        case 'birth_date':
        case 'rg_issue_date':
          const parsedDate = parseDate(rawValue);
          if (parsedDate) {
            contact[fieldName] = parsedDate;
          }
          break;
        default:
          (contact as any)[fieldName] = value;
      }
    }

    // Validate required fields
    if (!contact.full_name?.trim()) {
      contact._errors.push('Nome completo é obrigatório');
      contact._isValid = false;
    }
    if (!contact.phone?.trim()) {
      contact._errors.push('Telefone é obrigatório');
      contact._isValid = false;
    }

    return contact;
  };

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
        
        const contacts = jsonData.map((row, index) => parseRow(row, index + 2));
        
        setParsedContacts(contacts);
        setStep('preview');
      } catch (error) {
        console.error('Error parsing file:', error);
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const downloadTemplate = useCallback(() => {
    const headers = Object.keys(COLUMN_MAPPING);
    const exampleRow = {
      'Nome Completo': 'João da Silva',
      'Telefone': '(11) 99999-9999',
      'E-mail': 'joao@email.com',
      'CPF': '123.456.789-00',
      'RG': '12.345.678-9',
      'Órgão Emissor RG': 'SSP-SP',
      'Data Emissão RG': '01/01/2010',
      'Data de Nascimento': '15/05/1985',
      'Gênero': 'Masculino',
      'Estado Civil': 'Casado',
      'Profissão': 'Engenheiro',
      'Renda Mensal': '10000',
      'CEP': '01310-100',
      'Endereço': 'Av. Paulista',
      'Número': '1000',
      'Complemento': 'Sala 101',
      'Origem': 'Indicação',
      'Detalhe da Origem': 'Cliente antigo',
      'Campanha': 'Campanha Q1 2025',
      'Qualificação': '4',
      'Temperatura': 'Quente',
      'Anotações': 'Cliente interessado em investimentos',
    };

    const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
    
    // Set column widths
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');
    
    XLSX.writeFile(wb, 'modelo-importacao-contatos.xlsx');
  }, []);

  const handleImport = useCallback(async () => {
    const validContacts = parsedContacts.filter(c => c._isValid);
    
    if (validContacts.length === 0) {
      return;
    }

    const contactsToImport = validContacts.map(({ _rowNumber, _errors, _isValid, ...contact }) => contact);
    
    const result = await importContacts.mutateAsync(contactsToImport);
    setImportResult(result);
    setStep('result');
  }, [parsedContacts, importContacts]);

  const validCount = parsedContacts.filter(c => c._isValid).length;
  const invalidCount = parsedContacts.filter(c => !c._isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Contatos
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de uma planilha Excel ou CSV com os dados dos contatos.'}
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
              <p className="text-lg font-medium mb-2">Arraste e solte sua planilha aqui</p>
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
                {validCount} válido(s)
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedContacts.map((contact) => (
                    <TableRow key={contact._rowNumber} className={!contact._isValid ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-muted-foreground">{contact._rowNumber}</TableCell>
                      <TableCell>
                        {contact._isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{contact.full_name || '-'}</TableCell>
                      <TableCell>{contact.phone || '-'}</TableCell>
                      <TableCell>{contact.email || '-'}</TableCell>
                      <TableCell>
                        {contact._errors.length > 0 && (
                          <span className="text-sm text-destructive">
                            {contact._errors.join(', ')}
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
                disabled={validCount === 0 || importContacts.isPending}
              >
                {importContacts.isPending ? 'Importando...' : `Importar ${validCount} contato(s)`}
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
                    {importResult.success} contato(s) importado(s) com sucesso.
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
              <Button onClick={() => handleClose(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
