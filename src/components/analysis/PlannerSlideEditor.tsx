import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlannerProfile, useUpdatePlannerProfile, useUploadPlannerPhoto } from '@/hooks/usePlannerProfile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PlannerSlideEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PlannerProfile | null;
  userName: string;
}

interface FormData {
  display_name: string;
  professional_title: string;
  career_achievements: string;
  life_achievements: string;
  education: string;
  certifications: string;
  instagram_handle: string;
}

const DRAFT_KEY_PREFIX = 'planner_profile_draft_';

export function PlannerSlideEditor({ open, onOpenChange, profile, userName }: PlannerSlideEditorProps) {
  const { user } = useAuth();
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.photo_url || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdatePlannerProfile();
  const uploadPhoto = useUploadPlannerPhoto();

  const draftKey = user?.id ? `${DRAFT_KEY_PREFIX}${user.id}` : null;

  const getDefaultValues = useCallback((): FormData => ({
    display_name: profile?.display_name || '',
    professional_title: profile?.professional_title || '',
    career_achievements: profile?.career_achievements || '',
    life_achievements: profile?.life_achievements || '',
    education: profile?.education || '',
    certifications: profile?.certifications || '',
    instagram_handle: profile?.instagram_handle || '',
  }), [profile]);

  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: getDefaultValues(),
  });

  // Watch form values for auto-save
  const formValues = watch();

  // Check for draft on mount
  useEffect(() => {
    if (!open || !draftKey) return;
    
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.savedAt) {
          setHasDraft(true);
        }
      }
    } catch (e) {
      console.error('Error checking draft:', e);
    }
  }, [open, draftKey]);

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      reset(getDefaultValues());
      setPhotoPreview(profile.photo_url || null);
    }
  }, [profile, reset, getDefaultValues]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!open || !draftKey) return;
    
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          ...formValues,
          savedAt: Date.now(),
        }));
      } catch (e) {
        console.error('Error saving draft:', e);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formValues, open, draftKey]);

  const restoreDraft = () => {
    if (!draftKey) return;
    
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        reset({
          display_name: parsed.display_name || '',
          professional_title: parsed.professional_title || '',
          career_achievements: parsed.career_achievements || '',
          life_achievements: parsed.life_achievements || '',
          education: parsed.education || '',
          certifications: parsed.certifications || '',
          instagram_handle: parsed.instagram_handle || '',
        });
        setHasDraft(false);
        toast.success('Rascunho restaurado');
      }
    } catch (e) {
      console.error('Error restoring draft:', e);
    }
  };

  const discardDraft = () => {
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
    setHasDraft(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      let photoUrl = profile?.photo_url;

      if (photoFile) {
        photoUrl = await uploadPhoto.mutateAsync(photoFile);
      }

      await updateProfile.mutateAsync({
        ...data,
        photo_url: photoUrl,
      });

      // Clear draft on successful save
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Slide "Quem Sou Eu"</DialogTitle>
        </DialogHeader>

        {/* Draft restore notification */}
        {hasDraft && (
          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Você tem um rascunho não salvo
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={discardDraft}
              >
                Descartar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={restoreDraft}
              >
                Restaurar
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback className="text-2xl bg-accent text-accent-foreground">
                  {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-accent rounded-full text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="font-medium">{userName}</p>
              <p className="text-sm text-muted-foreground">
                Clique no ícone para alterar a foto
              </p>
            </div>
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <Label htmlFor="display_name">Nome no Slide</Label>
            <Input
              id="display_name"
              placeholder={userName}
              {...register('display_name')}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar seu nome de cadastro ({userName})
            </p>
          </div>

          {/* Career achievements */}
          <div className="space-y-2">
            <Label htmlFor="career_achievements">Principais Atingimentos de Carreira</Label>
            <Textarea
              id="career_achievements"
              placeholder="Um atingimento por linha"
              rows={3}
              {...register('career_achievements')}
            />
          </div>

          {/* Life achievements */}
          <div className="space-y-2">
            <Label htmlFor="life_achievements">Atingimentos de Vida Pessoal</Label>
            <Textarea
              id="life_achievements"
              placeholder="Um atingimento por linha"
              rows={3}
              {...register('life_achievements')}
            />
          </div>

          {/* Education */}
          <div className="space-y-2">
            <Label htmlFor="education">Formação Acadêmica</Label>
            <Textarea
              id="education"
              placeholder="Uma formação por linha"
              rows={2}
              {...register('education')}
            />
          </div>

          {/* Certifications */}
          <div className="space-y-2">
            <Label htmlFor="certifications">Premiações e Certificações</Label>
            <Textarea
              id="certifications"
              placeholder="Uma certificação por linha"
              rows={2}
              {...register('certifications')}
            />
          </div>

          {/* Instagram */}
          <div className="space-y-2">
            <Label htmlFor="instagram_handle">Instagram (opcional)</Label>
            <Input
              id="instagram_handle"
              placeholder="@seuperfil"
              {...register('instagram_handle')}
            />
          </div>

          {/* Limit warning */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Limite de exibição</p>
            <p>
              O slide exibirá no máximo <strong>8 itens</strong> no total, priorizando: 
              Formação → Carreira → Certificações → Vida pessoal.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
