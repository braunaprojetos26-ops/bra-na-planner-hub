import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlannerProfile, useUpdatePlannerProfile, useUploadPlannerPhoto } from '@/hooks/usePlannerProfile';

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

export function PlannerSlideEditor({ open, onOpenChange, profile, userName }: PlannerSlideEditorProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.photo_url || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdatePlannerProfile();
  const uploadPhoto = useUploadPlannerPhoto();

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      display_name: profile?.display_name || '',
      professional_title: profile?.professional_title || '',
      career_achievements: profile?.career_achievements || '',
      life_achievements: profile?.life_achievements || '',
      education: profile?.education || '',
      certifications: profile?.certifications || '',
      instagram_handle: '',
    },
  });

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
