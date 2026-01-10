import { useState, useRef } from 'react';
import { FileText, Download, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrainingMaterials } from '@/hooks/useTrainingMaterials';
import { useToast } from '@/hooks/use-toast';
import type { TrainingLessonMaterial } from '@/types/training';

interface LessonMaterialsProps {
  lessonId: string;
  isTrainer: boolean;
}

export function LessonMaterials({ lessonId, isTrainer }: LessonMaterialsProps) {
  const { toast } = useToast();
  const { materials, isLoading, uploadMaterial, deleteMaterial, getPublicUrl } = useTrainingMaterials(lessonId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      await uploadMaterial.mutateAsync({ lessonId, file });
      toast({
        title: 'Material enviado',
        description: 'O arquivo foi anexado à aula.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = (filePath: string) => {
    const url = getPublicUrl(filePath);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (material: TrainingLessonMaterial) => {
    if (!confirm('Excluir este material?')) return;
    
    try {
      await deleteMaterial.mutateAsync(material);
      toast({
        title: 'Material excluído',
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Materiais de Apoio
          </CardTitle>
          {isTrainer && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : materials?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum material disponível
          </p>
        ) : (
          <div className="space-y-2">
            {materials?.map((material) => (
              <div 
                key={material.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{material.name}</p>
                    {material.file_size && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(material.file_size)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDownload(material.file_path)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {isTrainer && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(material)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
