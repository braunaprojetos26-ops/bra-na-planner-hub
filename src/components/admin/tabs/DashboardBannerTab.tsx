import { useState, useRef } from 'react';
import { Image, Type, Link2, Eye, EyeOff, Upload, Trash2, Save, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useDashboardBanner, useUpdateDashboardBanner, DashboardBannerConfig } from '@/hooks/useDashboardBanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardBannerTab() {
  const { user } = useAuth();
  const { data: bannerConfig, isLoading } = useDashboardBanner();
  const updateBanner = useUpdateDashboardBanner();
  
  const [localConfig, setLocalConfig] = useState<Partial<DashboardBannerConfig>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge server config with local changes
  const currentConfig: DashboardBannerConfig = {
    image_url: localConfig.image_url !== undefined ? localConfig.image_url : bannerConfig?.image_url || null,
    overlay_text: localConfig.overlay_text !== undefined ? localConfig.overlay_text : bannerConfig?.overlay_text || '',
    link_url: localConfig.link_url !== undefined ? localConfig.link_url : bannerConfig?.link_url || null,
    is_active: localConfig.is_active !== undefined ? localConfig.is_active : bannerConfig?.is_active ?? true,
  };

  const hasChanges = Object.keys(localConfig).length > 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `dashboard-banner-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('presentations')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('presentations')
        .getPublicUrl(filePath);

      setLocalConfig(prev => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setLocalConfig(prev => ({ ...prev, image_url: null }));
  };

  const handleSave = async () => {
    try {
      await updateBanner.mutateAsync(localConfig);
      setLocalConfig({});
      toast.success('Banner atualizado com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleCancel = () => {
    setLocalConfig({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Banner do Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Configure o banner exibido no topo do dashboard para todos os usuários
        </p>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`relative w-full h-[120px] rounded-xl overflow-hidden ${
              !currentConfig.is_active ? 'opacity-50' : ''
            }`}
          >
            {/* Background */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/50"
              style={
                currentConfig.image_url
                  ? {
                      backgroundImage: `url(${currentConfig.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            
            {/* Content preview */}
            <div className="relative h-full flex items-center justify-between px-6">
              <div className="text-white">
                <h2 className="text-xl font-bold drop-shadow-md">Nome do Usuário</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-sm text-white/90 font-medium">Planejador Financeiro</span>
                </div>
              </div>
              {currentConfig.overlay_text && (
                <p className="hidden sm:block text-lg font-light text-white/95 italic drop-shadow-md max-w-xs text-right">
                  "{currentConfig.overlay_text}"
                </p>
              )}
            </div>

            {!currentConfig.is_active && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="text-white font-medium bg-black/50 px-3 py-1 rounded">
                  Banner Desativado
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" />
              Imagem de Fundo
            </CardTitle>
            <CardDescription>
              Recomendado: 1920x400px, máximo 5MB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            
            {currentConfig.image_url ? (
              <div className="space-y-3">
                <div className="relative aspect-[5/1] rounded-lg overflow-hidden border">
                  <img
                    src={currentConfig.image_url}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Trocar Imagem
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">Clique para fazer upload</span>
                  </div>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Text & Link Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="h-4 w-4" />
              Texto e Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="overlay-text">Texto de Destaque</Label>
              <Input
                id="overlay-text"
                placeholder="Ex: O caminho das suas conquistas."
                value={currentConfig.overlay_text}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, overlay_text: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Exibido no lado direito do banner
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-url" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Link (opcional)
              </Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://..."
                value={currentConfig.link_url || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, link_url: e.target.value || null }))}
              />
              <p className="text-xs text-muted-foreground">
                Ao clicar no banner, abre este link em nova aba
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active toggle and save */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {currentConfig.is_active ? (
                  <Eye className="h-4 w-4 text-green-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="is-active" className="font-medium">
                  Banner {currentConfig.is_active ? 'Ativo' : 'Desativado'}
                </Label>
              </div>
              <Switch
                id="is-active"
                checked={currentConfig.is_active}
                onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex gap-2">
              {hasChanges && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateBanner.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
