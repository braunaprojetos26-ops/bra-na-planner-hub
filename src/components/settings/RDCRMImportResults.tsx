import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Users, Phone, Mail, Copy, RotateCcw, Handshake, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImportJobStatus } from '@/hooks/useRDCRM';

interface RDCRMImportResultsProps {
  jobStatus: ImportJobStatus;
  onReset: () => void;
}

export function RDCRMImportResults({ jobStatus, onReset }: RDCRMImportResultsProps) {
  const [showErrors, setShowErrors] = useState(false);

  // Extract unified stats from error_details
  const stats = useMemo(() => {
    const statsEntry = jobStatus.error_details?.find(e => e.name === '__stats__');
    if (statsEntry) {
      try {
        return JSON.parse(statsEntry.error) as { opportunities_created: number; contracts_created: number };
      } catch { /* ignore */ }
    }
    return { opportunities_created: 0, contracts_created: 0 };
  }, [jobStatus.error_details]);

  const realErrors = useMemo(() => {
    return (jobStatus.error_details || []).filter(e => e.name !== '__stats__');
  }, [jobStatus.error_details]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-green-500/10 border-green-500/20 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xl font-bold text-green-600">{jobStatus.contacts_imported}</p>
          </div>
          <p className="text-xs text-muted-foreground">Contatos criados</p>
        </div>
        <div className="rounded-lg border bg-blue-500/10 border-blue-500/20 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <Handshake className="h-3.5 w-3.5 text-blue-600" />
            <p className="text-xl font-bold text-blue-600">{stats.opportunities_created}</p>
          </div>
          <p className="text-xs text-muted-foreground">Negociações criadas</p>
        </div>
        <div className="rounded-lg border bg-purple-500/10 border-purple-500/20 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <FileText className="h-3.5 w-3.5 text-purple-600" />
            <p className="text-xl font-bold text-purple-600">{stats.contracts_created}</p>
          </div>
          <p className="text-xs text-muted-foreground">Contratos criados</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xl font-bold text-foreground">{jobStatus.contacts_skipped}</p>
          </div>
          <p className="text-xs text-muted-foreground">Já existentes</p>
        </div>
      </div>

      {jobStatus.contacts_errors > 0 && (
        <div className="rounded-lg border bg-destructive/10 border-destructive/20 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            <p className="text-xl font-bold text-destructive">{jobStatus.contacts_errors}</p>
          </div>
          <p className="text-xs text-muted-foreground">Erros</p>
        </div>
      )}

      {jobStatus.error_message && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-sm text-destructive font-medium">Erro: {jobStatus.error_message}</p>
        </div>
      )}

      {realErrors.length > 0 && (() => {
        const grouped = realErrors.reduce<Record<string, Array<{ name: string; error: string }>>>((acc, err) => {
          let category = 'Outros erros';
          if (err.error.includes('não encontrado')) category = 'Contato não encontrado';
          else if (err.error.includes('contacts_phone_key')) category = 'Telefone duplicado';
          else if (err.error.includes('Sem telefone')) category = 'Sem dados de contato';
          else if (err.error.includes('email')) category = 'E-mail duplicado';
          else if (err.error.includes('Oportunidade')) category = 'Erros de negociação';
          if (!acc[category]) acc[category] = [];
          acc[category].push(err);
          return acc;
        }, {});

        const categoryIcons: Record<string, typeof Phone> = {
          'Contato não encontrado': Users,
          'Telefone duplicado': Phone,
          'Sem dados de contato': AlertTriangle,
          'E-mail duplicado': Mail,
          'Erros de negociação': Handshake,
          'Outros erros': XCircle,
        };

        return (
          <div className="rounded-lg border border-destructive/20 overflow-hidden">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="w-full flex items-center justify-between px-3 py-2 bg-destructive/5 hover:bg-destructive/10 transition-colors text-sm font-medium text-destructive"
            >
              <span>Detalhes ({realErrors.length})</span>
              {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showErrors && (
              <div className="max-h-72 overflow-y-auto border-t border-border">
                {Object.entries(grouped).map(([category, items]) => {
                  const Icon = categoryIcons[category] || XCircle;
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 sticky top-0 border-b border-border">
                        <Icon className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-xs font-semibold text-destructive">{category}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{items.length}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {items.map((err, i) => (
                          <div key={i} className="px-3 py-1.5 text-xs flex items-center gap-2">
                            <Copy className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            <span className="font-medium text-foreground truncate">{err.name || 'Sem nome'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <Button variant="outline" size="sm" onClick={onReset} className="w-full">
        <RotateCcw className="mr-2 h-3.5 w-3.5" />
        Nova importação
      </Button>
    </div>
  );
}
