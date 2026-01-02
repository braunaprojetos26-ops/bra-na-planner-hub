import { useAuth } from '@/contexts/AuthContext';
import { useDashboardBanner } from '@/hooks/useDashboardBanner';
import { MyGoalsDrawer } from './MyGoalsDrawer';
import { ExternalLink } from 'lucide-react';

const roleLabels: Record<string, string> = {
  planejador: 'Planejador Financeiro',
  lider: 'Líder Comercial',
  supervisor: 'Supervisor',
  gerente: 'Gerente',
  superadmin: 'Administrador',
};

export function DashboardHeader() {
  const { profile, role } = useAuth();
  const { data: bannerConfig } = useDashboardBanner();

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuário';
  const fullName = profile?.full_name || 'Usuário';
  const roleLabel = role ? roleLabels[role] : '';
  const isActive = bannerConfig?.is_active ?? true;
  const overlayText = bannerConfig?.overlay_text || '';
  const imageUrl = bannerConfig?.image_url;
  const linkUrl = bannerConfig?.link_url;

  const BannerWrapper = linkUrl ? 'a' : 'div';
  const bannerProps = linkUrl
    ? { href: linkUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <div className="space-y-4">
      {/* Title row with goals button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <MyGoalsDrawer />
      </div>

      {/* Banner */}
      {isActive && (
        <BannerWrapper
          {...bannerProps}
          className={`relative w-full h-[120px] md:h-[140px] rounded-xl overflow-hidden ${
            linkUrl ? 'cursor-pointer group' : ''
          }`}
        >
          {/* Background */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/50"
            style={
              imageUrl
                ? {
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

          {/* Content */}
          <div className="relative h-full flex items-center justify-between px-6 md:px-8">
            {/* Left side: User info */}
            <div className="text-white">
              <h2 className="text-xl md:text-2xl font-bold drop-shadow-md">
                {fullName}
              </h2>
              {roleLabel && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm md:text-base text-white/90 font-medium drop-shadow-sm">
                    {roleLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Right side: Overlay text */}
            {overlayText && (
              <div className="hidden sm:flex items-center gap-3 text-right">
                <p className="text-lg md:text-xl font-light text-white/95 italic drop-shadow-md max-w-xs">
                  "{overlayText}"
                </p>
                {linkUrl && (
                  <ExternalLink className="h-4 w-4 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            )}
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        </BannerWrapper>
      )}
    </div>
  );
}
