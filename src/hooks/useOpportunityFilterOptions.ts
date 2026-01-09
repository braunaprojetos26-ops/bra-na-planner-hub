import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Opportunity } from '@/types/opportunities';

export function useOpportunityFilterOptions(opportunities: Opportunity[] | undefined) {
  // Extract unique contact IDs that are referrers
  const referrerIds = useMemo(() => {
    if (!opportunities) return [];
    const ids = opportunities
      .map(o => o.contact?.referred_by)
      .filter((id): id is string => !!id);
    return [...new Set(ids)];
  }, [opportunities]);

  // Fetch referrer contact names
  const { data: referrers } = useQuery({
    queryKey: ['referrer-contacts', referrerIds],
    queryFn: async () => {
      if (referrerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name')
        .in('id', referrerIds);
      if (error) throw error;
      return data;
    },
    enabled: referrerIds.length > 0,
  });

  // Extract unique sources
  const sources = useMemo(() => {
    if (!opportunities) return [];
    const uniqueSources = opportunities
      .map(o => o.contact?.source)
      .filter((s): s is string => !!s && s.trim() !== '');
    return [...new Set(uniqueSources)].sort();
  }, [opportunities]);

  // Extract unique campaigns
  const campaigns = useMemo(() => {
    if (!opportunities) return [];
    const uniqueCampaigns = opportunities
      .map(o => o.contact?.campaign)
      .filter((c): c is string => !!c && c.trim() !== '');
    return [...new Set(uniqueCampaigns)].sort();
  }, [opportunities]);

  return { sources, campaigns, referrers: referrers || [] };
}
