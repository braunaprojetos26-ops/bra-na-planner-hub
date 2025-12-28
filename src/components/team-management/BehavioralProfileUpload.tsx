import { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUploadBehavioralProfilePDF } from '@/hooks/useBehavioralProfile';

interface BehavioralProfileUploadProps {
  userId: string;
  existingReportUrl?: string | null;
}

export function BehavioralProfileUpload({ userId, existingReportUrl }: BehavioralProfileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadMutation = useUploadBehavioralProfilePDF();

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes('pdf')) {
      return;
    }
    await uploadMutation.mutateAsync({ userId, file });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8 text-center">
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Processando PDF com IA...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Arraste o PDF do relatório Sólides aqui</p>
                <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Selecionar arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {existingReportUrl && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-sm flex-1">Relatório atual</span>
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={existingReportUrl} target="_blank" rel="noopener noreferrer">
              Ver PDF
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
