import { useRef, useState, useEffect } from 'react';
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
import titleShape from '@/assets/slide/title-shape.png';
import braunaLogo from '@/assets/slide/brauna-logo-white.png';

interface PlannerSlideViewProps {
  profile: PlannerProfile | null;
  userName: string;
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

export function PlannerSlideView({ profile, userName }: PlannerSlideViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detect fullscreen changes internally
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === containerRef.current
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  // Get instagram handle directly from profile
  const instagramHandle = profile?.instagram_handle?.trim();

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-xl font-saira',
        isFullscreen 
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none' 
          : 'aspect-[16/9]'
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

      {/* Braúna logo - bottom right */}
      <img 
        src={braunaLogo} 
        alt="Braúna" 
        className={cn(
          "absolute w-auto",
          isFullscreen 
            ? "bottom-8 right-8 h-16" 
            : "bottom-4 right-4 h-8 md:h-10"
        )}
      />

      {/* Main content */}
      <div className={cn(
        'relative z-10 h-full flex flex-col',
        isFullscreen ? 'p-12 md:p-16 lg:p-20' : 'p-6 md:p-8'
      )}>
        {/* Title section with decorative shapes */}
        <div className={cn(
          "relative flex items-center",
          isFullscreen ? "mb-10 md:mb-14" : "mb-6 md:mb-8"
        )}>
          {/* Title shape container */}
          <div className={cn(
            "relative shrink-0",
            isFullscreen 
              ? "w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36" 
              : "w-14 h-14 md:w-20 md:h-20"
          )}>
            {/* Blue shape with cut corner */}
            <img 
              src={titleShape} 
              alt="" 
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* Gold square - overlapping top-left */}
            <img 
              src={decorativeSquare} 
              alt="" 
              className={cn(
                "absolute",
                isFullscreen 
                  ? "-bottom-2 -left-2 w-10 h-10 md:w-12 md:h-12" 
                  : "-bottom-1 -left-1 w-5 h-5 md:w-7 md:h-7"
              )}
            />
          </div>
          
          {/* Title text - positioned to start from middle of the shape */}
          <h2 
            className={cn(
              "text-white absolute",
              isFullscreen 
                ? "text-4xl md:text-5xl lg:text-6xl left-12 md:left-16 lg:left-18" 
                : "text-xl md:text-2xl lg:text-3xl left-7 md:left-10"
            )}
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          >
            <span className="font-light">Quem </span>
            <span className="italic font-medium" style={{ 
              textDecoration: 'underline',
              textDecorationColor: '#C9A55A',
              textUnderlineOffset: '4px',
            }}>Sou</span>
            <span className="font-light"> eu?</span>
          </h2>
        </div>

        {/* Content grid */}
        <div className={cn(
          "flex-1 flex flex-col md:flex-row items-center md:items-start",
          isFullscreen ? "gap-12 md:gap-20 lg:gap-28" : "gap-6 md:gap-10"
        )}>
          {/* Left side - Photo and name */}
          <div className="flex flex-col items-center shrink-0">
            {/* Photo with frames */}
            <div className={cn(
              "relative mb-4",
              isFullscreen 
                ? "w-56 h-72 md:w-72 md:h-96 lg:w-80 lg:h-[26rem] mb-8" 
                : "w-32 h-40 md:w-40 md:h-48 lg:w-48 lg:h-56"
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
                    <User className={cn(
                      "text-white/50",
                      isFullscreen ? "w-20 h-20" : "w-12 h-12"
                    )} />
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="text-center">
              <p 
                className={cn(
                  "font-semibold",
                  isFullscreen 
                    ? "text-3xl md:text-4xl lg:text-5xl" 
                    : "text-xl md:text-2xl lg:text-3xl"
                )}
                style={{ color: '#C9A55A' }}
              >
                {firstName}
              </p>
              {lastName && (
                <p className={cn(
                  "font-light text-white",
                  isFullscreen 
                    ? "text-2xl md:text-3xl lg:text-4xl" 
                    : "text-lg md:text-xl lg:text-2xl"
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
                isFullscreen ? "space-y-4 md:space-y-6 lg:space-y-7" : "space-y-2 md:space-y-3"
              )}>
                {achievements.map((achievement, index) => {
                  const Icon = getIconForType(achievement.type, index);
                  return (
                    <li 
                      key={index} 
                      className={cn(
                        "flex items-start text-white",
                        isFullscreen ? "gap-4 md:gap-5" : "gap-3"
                      )}
                    >
                      <Icon 
                        className={cn(
                          "shrink-0 mt-0.5",
                          isFullscreen 
                            ? "w-6 h-6 md:w-8 md:h-8 lg:w-9 lg:h-9" 
                            : "w-4 h-4 md:w-5 md:h-5"
                        )}
                        style={{ color: '#C9A55A' }}
                      />
                      <span className={cn(
                        "font-light leading-tight",
                        isFullscreen 
                          ? "text-xl md:text-2xl lg:text-3xl" 
                          : "text-sm md:text-base lg:text-lg"
                      )}>
                        {achievement.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8 text-white/50">
                <User className={cn(
                  "mx-auto mb-3 opacity-50",
                  isFullscreen ? "w-20 h-20" : "w-12 h-12"
                )} />
                <p className={cn(
                  isFullscreen ? "text-lg" : "text-sm"
                )}>
                  Clique em "Editar" para preencher seu perfil
                </p>
              </div>
            )}

            {/* Instagram handle */}
            {instagramHandle && (
              <div 
                className={cn(
                  "flex items-center",
                  isFullscreen ? "mt-8 gap-3" : "mt-4 gap-2"
                )} 
                style={{ color: '#C9A55A' }}
              >
                <Instagram className={cn(
                  isFullscreen ? "w-6 h-6 md:w-7 md:h-7" : "w-4 h-4"
                )} />
                <span className={cn(
                  "font-medium",
                  isFullscreen ? "text-lg md:text-xl" : "text-sm"
                )}>
                  {instagramHandle.startsWith('@') ? instagramHandle : `@${instagramHandle}`}
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
