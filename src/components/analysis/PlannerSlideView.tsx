import { useRef } from 'react';
import { Award, BookOpen, GraduationCap, Star, User } from 'lucide-react';
import { PlannerProfile } from '@/hooks/usePlannerProfile';
import { FullscreenButton } from './FullscreenWrapper';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PlannerSlideViewProps {
  profile: PlannerProfile | null;
  userName: string;
  isFullscreen?: boolean;
}

export function PlannerSlideView({ profile, userName, isFullscreen }: PlannerSlideViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const parseAchievements = (text: string | null | undefined): string[] => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim());
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl p-8 text-white',
        isFullscreen && 'w-full h-full flex items-center justify-center'
      )}
    >
      <div className={cn(
        'max-w-4xl mx-auto',
        isFullscreen && 'scale-125'
      )}>
        {/* Header with photo and name */}
        <div className="flex items-center gap-6 mb-8">
          <Avatar className="w-32 h-32 border-4 border-amber-400">
            <AvatarImage src={profile?.photo_url || undefined} alt={userName} />
            <AvatarFallback className="bg-amber-400 text-[#1a1a2e] text-4xl font-bold">
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-amber-400">{userName}</h1>
            <p className="text-xl text-gray-300 mt-1">
              {profile?.professional_title || 'Planejador Financeiro'}
            </p>
          </div>
        </div>

        {/* Grid with achievements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Career Achievements */}
          {profile?.career_achievements && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Award className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Carreira</h3>
              </div>
              <ul className="space-y-2">
                {parseAchievements(profile.career_achievements).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-200">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Life Achievements */}
          {profile?.life_achievements && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Star className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Vida</h3>
              </div>
              <ul className="space-y-2">
                {parseAchievements(profile.life_achievements).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-200">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Education */}
          {profile?.education && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <GraduationCap className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Formação</h3>
              </div>
              <ul className="space-y-2">
                {parseAchievements(profile.education).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-200">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Certifications */}
          {profile?.certifications && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Certificações</h3>
              </div>
              <ul className="space-y-2">
                {parseAchievements(profile.certifications).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-200">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Empty state */}
        {!profile?.career_achievements && !profile?.life_achievements && 
         !profile?.education && !profile?.certifications && (
          <div className="text-center py-8 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Clique em "Editar" para preencher seu perfil</p>
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div className="mt-6 flex justify-end">
          <FullscreenButton targetRef={containerRef} />
        </div>
      )}
    </div>
  );
}
