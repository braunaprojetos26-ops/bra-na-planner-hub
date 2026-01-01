import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HealthScoreBreakdown {
  nps: { score: number; value: number | null; status: string };
  referrals: { score: number; hasReferrals: boolean; count: number };
  payment: { score: number; daysLate: number; status: string };
  crossSell: { score: number; extraProductsCount: number };
  meetings: { score: number; daysSinceLastMeeting: number | null };
  whatsapp: { score: number; daysSinceLastMessage: number | null; status: string };
}

export interface HealthScoreResult {
  contactId: string;
  contactName: string;
  ownerId: string | null;
  ownerName: string | null;
  totalScore: number;
  category: 'otimo' | 'estavel' | 'atencao' | 'critico';
  breakdown: HealthScoreBreakdown;
}

export interface HealthScoreSummary {
  totalClients: number;
  averageScore: number;
  byCategory: {
    otimo: number;
    estavel: number;
    atencao: number;
    critico: number;
  };
}

export interface UseHealthScoreFilters {
  ownerId?: string;
  ownerIds?: string[];
  contactIds?: string[];
}

export function useHealthScore(filters?: UseHealthScoreFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['health-score', filters?.ownerId, filters?.ownerIds, filters?.contactIds],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-health-score', {
        body: {
          ownerId: filters?.ownerId,
          ownerIds: filters?.ownerIds,
          contactIds: filters?.contactIds,
        },
      });

      if (error) {
        console.error('Error calculating health score:', error);
        throw error;
      }

      return data as { results: HealthScoreResult[]; summary: HealthScoreSummary };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Category colors and labels
export const CATEGORY_CONFIG = {
  otimo: {
    label: 'Ótimo',
    color: 'hsl(var(--success))',
    bgColor: 'bg-green-500',
    textColor: 'text-green-500',
    lightBg: 'bg-green-500/10',
    range: '75-100',
  },
  estavel: {
    label: 'Estável',
    color: 'hsl(var(--info))',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-500',
    lightBg: 'bg-blue-500/10',
    range: '50-74',
  },
  atencao: {
    label: 'Atenção',
    color: 'hsl(var(--warning))',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    lightBg: 'bg-yellow-500/10',
    range: '30-49',
  },
  critico: {
    label: 'Crítico',
    color: 'hsl(var(--destructive))',
    bgColor: 'bg-red-500',
    textColor: 'text-red-500',
    lightBg: 'bg-red-500/10',
    range: '0-29',
  },
} as const;

export type CategoryKey = keyof typeof CATEGORY_CONFIG;
