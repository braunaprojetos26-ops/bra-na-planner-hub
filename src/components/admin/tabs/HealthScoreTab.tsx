import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNpsImport, useNpsImportHistory } from '@/hooks/useNpsImport';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export function HealthScoreTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<Array<{ email: string; npsValue: number; responseDate: string }>>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  
  const { importNps, isImporting, importResult } = useNpsImport();
  const { data: importHistory } = useNpsImportHistory();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseErrors([]);
    setPreviewData([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

      const errors: string[] = [];
      const records: Array<{ email: string; npsValue: number; responseDate: string }> = [];

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const email = String(row[0] || '').trim().toLowerCase();
        const npsValue = Number(row[1]);
        const responseDate = row[2];

        if (!email) {
          errors.push(`Linha ${i + 1}: Email vazio`);
          continue;
        }

        if (isNaN(npsValue) || npsValue < 0 || npsValue > 10) {
          errors.push(`Linha ${i + 1}: Nota NPS inválida (deve ser 0-10)`);
          continue;
        }

        let formattedDate: string;
        if (typeof responseDate === 'number') {
          // Excel date serial number
          const date = XLSX.SSF.parse_date_code(responseDate);
          formattedDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        } else if (responseDate) {
          formattedDate = String(responseDate);
        } else {
          formattedDate = format(new Date(), 'yyyy-MM-dd');
        }

        records.push({ email, npsValue, responseDate: formattedDate });
      }

      setParseErrors(errors);
      setPreviewData(records);
    } catch (err) {
      setParseErrors(['Erro ao ler arquivo. Verifique se é um arquivo Excel válido.']);
    }
  };

  const handleImport = () => {
    if (previewData.length === 0) return;
    importNps(previewData);
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const template = [
      ['email_cliente', 'nota_nps', 'data_resposta'],
      ['cliente@email.com', 9, '2024-01-15'],
      ['outro@email.com', 7, '2024-01-15'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NPS');
    XLSX.writeFile(wb, 'template_importacao_nps.xlsx');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação de NPS
          </CardTitle>
          <CardDescription>
            Importe respostas NPS de clientes via planilha Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nps-file">Arquivo Excel</Label>
            <Input
              id="nps-file"
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc pl-4 text-sm">
                  {parseErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {parseErrors.length > 5 && <li>...e mais {parseErrors.length - 5} erros</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {previewData.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {previewData.length} registros prontos para importação
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>NPS</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{row.email}</TableCell>
                        <TableCell>{row.npsValue}</TableCell>
                        <TableCell>{row.responseDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Importar {previewData.length} registros
              </Button>
            </div>
          )}

          {importResult && (
            <Alert variant={importResult.success ? 'default' : 'destructive'}>
              <AlertDescription className="flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {importResult.successCount} importados, {importResult.errorCount} erros
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {importHistory && importHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Importações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Sucesso</TableHead>
                  <TableHead>Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell>{format(new Date(imp.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell className="text-green-500">{imp.success_count}</TableCell>
                    <TableCell className="text-red-500">{imp.error_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
