import { useRef } from 'react';
import { 
  GraduationCap, 
  Award, 
  BadgeCheck, 
  Trophy, 
  Briefcase, 
  Heart,
  Instagram,
  User
} from 'lucide-react';
import { PlannerProfile } from '@/hooks/usePlannerProfile';
import { FullscreenButton } from './FullscreenWrapper';
import { cn } from '@/lib/utils';

// Import slide assets
import backgroundTexture from '@/assets/slide/background-texture.jpg';
import photoFrameBlue from '@/assets/slide/photo-frame-blue.png';
import photoFrameGold from '@/assets/slide/photo-frame-gold.png';
import decorativeSquare from '@/assets/slide/decorative-square.png';
import braunaLogo from '@/assets/slide/brauna-logo-white.png';

interface PlannerSlideViewProps {
  profile: PlannerProfile | null;
  userName: string;
  isFullscreen?: boolean;
}

interface AchievementItem {
  text: string;
  type: 'education' | 'career' | 'certification' | 'life';
}

const MAX_ACHIEVEMENTS = 8;

const getIconForType = (type: AchievementItem['type'], index: number) => {
  const icons = {
    education: GraduationCap,
    career: [Briefcase, Award, Trophy],
    certification: BadgeCheck,
    life: Heart,
  };

  if (type === 'career') {
    const careerIcons = icons.career;
    return careerIcons[index % careerIcons.length];
  }
  return icons[type];
};

export function PlannerSlideView({ profile, userName, isFullscreen }: PlannerSlideViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse achievements from all fields and combine into a single list
  const parseAchievements = (text: string | null | undefined): string[] => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim());
  };

  // Combine all achievements with priority order
  const getAllAchievements = (): AchievementItem[] => {
    const achievements: AchievementItem[] = [];

    // Priority 1: Education
    parseAchievements(profile?.education).forEach(text => {
      achievements.push({ text, type: 'education' });
    });

    // Priority 2: Career
    parseAchievements(profile?.career_achievements).forEach(text => {
      achievements.push({ text, type: 'career' });
    });

    // Priority 3: Certifications
    parseAchievements(profile?.certifications).forEach(text => {
      achievements.push({ text, type: 'certification' });
    });

    // Priority 4: Life
    parseAchievements(profile?.life_achievements).forEach(text => {
      achievements.push({ text, type: 'life' });
    });

    return achievements.slice(0, MAX_ACHIEVEMENTS);
  };

  const achievements = getAllAchievements();

  // Use display_name if available, otherwise use userName
  const displayName = profile?.display_name || userName;
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const hasContent = achievements.length > 0;

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-xl font-saira',
        isFullscreen ? 'w-full h-full' : 'aspect-[16/9]'
      )}
      style={{ 
        backgroundColor: 'rgb(0, 28, 68)',
      }}
    >
      {/* Background texture */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${backgroundTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Decorative square - top left */}
      <img 
        src={decorativeSquare} 
        alt="" 
        className="absolute top-4 left-4 w-6 h-6 md:w-8 md:h-8"
      />

      {/* Braúna logo - bottom right */}
      <img 
        src={braunaLogo} 
        alt="Braúna" 
        className="absolute bottom-4 right-4 h-8 md:h-10 w-auto"
      />

      {/* Main content */}
      <div className={cn(
        'relative z-10 h-full flex flex-col p-6 md:p-8',
        isFullscreen && 'p-12 md:p-16 lg:p-20'
      )}>
        {/* Title - Quem Sou eu? */}
        <h2 className={cn(
          "text-xl md:text-2xl lg:text-3xl text-white mb-6 md:mb-8",
          isFullscreen && "text-3xl md:text-4xl lg:text-5xl mb-8 md:mb-12"
        )}>
          <span className="font-light">Quem </span>
          <span className="italic font-medium" style={{ 
            textDecoration: 'underline',
            textDecorationColor: '#C9A55A',
            textUnderlineOffset: '4px',
          }}>Sou</span>
          <span className="font-light"> eu?</span>
        </h2>

        {/* Content grid */}
        <div className={cn(
          "flex-1 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start",
          isFullscreen && "gap-10 md:gap-16 lg:gap-20"
        )}>
          {/* Left side - Photo and name */}
          <div className="flex flex-col items-center shrink-0">
            {/* Photo with frames */}
            <div className={cn(
              "relative w-32 h-40 md:w-40 md:h-48 lg:w-48 lg:h-56 mb-4",
              isFullscreen && "w-48 h-56 md:w-64 md:h-80 lg:w-80 lg:h-96 mb-6"
            )}>
              {/* Gold frame (behind) */}
              <img 
                src={photoFrameGold} 
                alt="" 
                className="absolute inset-0 w-full h-full object-contain"
                style={{ transform: 'translate(4px, 4px)' }}
              />
              {/* Blue frame with photo */}
              <div className="absolute inset-0 w-full h-full">
                <img 
                  src={photoFrameBlue} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {/* Photo inside frame */}
                {profile?.photo_url ? (
                  <img 
                    src={profile.photo_url} 
                    alt={userName}
                    className="absolute inset-[8%] w-[84%] h-[84%] object-cover"
                    style={{ 
                      clipPath: 'polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)',
                    }}
                  />
                ) : (
                  <div 
                    className="absolute inset-[8%] w-[84%] h-[84%] bg-white/10 flex items-center justify-center"
                    style={{ 
                      clipPath: 'polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)',
                    }}
                  >
                    <User className="w-12 h-12 text-white/50" />
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="text-center">
              <p 
                className={cn(
                  "text-xl md:text-2xl lg:text-3xl font-semibold",
                  isFullscreen && "text-2xl md:text-3xl lg:text-4xl"
                )}
                style={{ color: '#C9A55A' }}
              >
                {firstName}
              </p>
              {lastName && (
                <p className={cn(
                  "text-lg md:text-xl lg:text-2xl font-light text-white",
                  isFullscreen && "text-xl md:text-2xl lg:text-3xl"
                )}>
                  {lastName}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Achievements */}
          <div className="flex-1 flex flex-col justify-center">
            {hasContent ? (
              <ul className={cn(
                "space-y-2 md:space-y-3",
                isFullscreen && "space-y-3 md:space-y-4 lg:space-y-5"
              )}>
                {achievements.map((achievement, index) => {
                  const Icon = getIconForType(achievement.type, index);
                  return (
                    <li 
                      key={index} 
                      className="flex items-start gap-3 text-white"
                    >
                      <Icon 
                        className={cn(
                          "w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5",
                          isFullscreen && "w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7"
                        )}
                        style={{ color: '#C9A55A' }}
                      />
                      <span className={cn(
                        "text-sm md:text-base lg:text-lg font-light leading-tight",
                        isFullscreen && "text-base md:text-lg lg:text-xl xl:text-2xl"
                      )}>
                        {achievement.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8 text-white/50">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Clique em "Editar" para preencher seu perfil</p>
              </div>
            )}

            {/* Instagram handle if exists */}
            {profile?.professional_title?.includes('@') && (
              <div className="mt-4 flex items-center gap-2" style={{ color: '#C9A55A' }}>
                <Instagram className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {profile.professional_title.match(/@\w+/)?.[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen button */}
      {!isFullscreen && (
        <div className="absolute bottom-4 left-4 z-20">
          <FullscreenButton targetRef={containerRef} />
        </div>
      )}
    </div>
  );
}
