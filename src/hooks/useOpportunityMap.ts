import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActingUser } from '@/contexts/ActingUserContext';

// Categories that count as "Crédito"
const CREDIT_CATEGORIES = [
  'Consórcio',
  'Home Equity',
  'Financiamento Imobiliário',
  'Financiamento Auto',
  'Carta Contemplada Auto',
  'Carta Contemplada Imobiliário',
  'Crédito com Colateral XP',
];

export interface OpportunityMapRow {
  contactId: string;
  clientName: string;
  ownerName: string | null;
  planejamento: number | null;
  paAtivo: number | null;
  credito: number | null;
  investimentosXP: number | null;
  prunus: number | null;
  cartaoXP: boolean | null;
  previdencia: number | null;
}

export interface OpportunityMapMetrics {
  totalClientes: number;
  planejamentoTotal: number;
  planejamentoCount: number;
  paAtivoTotal: number;
  paAtivoCount: number;
  creditoTotal: number;
  creditoCount: number;
  prunusTotal: number;
  prunusCount: number;
}

interface UseOpportunityMapOptions {
  searchTerm?: string;
  ownerId?: string;
}

export function useOpportunityMap(options: UseOpportunityMapOptions = {}) {
  const { actingUser } = useActingUser();
  const effectiveUserId = actingUser?.id;

  return useQuery({
    queryKey: ['opportunity-map', options.searchTerm, options.ownerId, effectiveUserId],
    queryFn: async (): Promise<{ rows: OpportunityMapRow[]; metrics: OpportunityMapMetrics }> => {
      // Fetch all active contracts with product and category info
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contact_id,
          contract_value,
          product_id,
          product:products (
            id,
            name,
            category:product_categories (
              id,
              name
            )
          ),
          contact:contacts (
            id,
            full_name,
            owner:profiles!contacts_owner_id_fkey (
              full_name
            )
          )
        `)
        .eq('status', 'active');

      if (contractsError) throw contractsError;

      // Group contracts by contact
      const contactMap = new Map<string, {
        contactId: string;
        clientName: string;
        ownerName: string | null;
        planejamento: number;
        paAtivo: number;
        credito: number;
        prunus: number;
        previdencia: number;
      }>();

      contracts?.forEach((contract) => {
        const contact = contract.contact as any;
        const product = contract.product as any;
        const category = product?.category as any;
        
        if (!contact || !product) return;

        const contactId = contact.id;
        const clientName = contact.full_name;
        const ownerName = contact.owner?.full_name || null;
        const categoryName = category?.name || '';
        const productName = product.name || '';
        const value = Number(contract.contract_value) || 0;

        if (!contactMap.has(contactId)) {
          contactMap.set(contactId, {
            contactId,
            clientName,
            ownerName,
            planejamento: 0,
            paAtivo: 0,
            credito: 0,
            prunus: 0,
            previdencia: 0,
          });
        }

        const entry = contactMap.get(contactId)!;

        // Categorize the contract value
        if (categoryName === 'Planejamento Financeiro') {
          entry.planejamento += value;
        } else if (categoryName === 'Seguro de Vida') {
          entry.paAtivo += value;
        } else if (CREDIT_CATEGORIES.includes(categoryName)) {
          entry.credito += value;
        } else if (productName === 'Prunus') {
          entry.prunus += value;
        } else if (categoryName === 'Previdência') {
          entry.previdencia += value;
        }
      });

      // Convert to array and apply filters
      let rows: OpportunityMapRow[] = Array.from(contactMap.values()).map((entry) => ({
        contactId: entry.contactId,
        clientName: entry.clientName,
        ownerName: entry.ownerName,
        planejamento: entry.planejamento > 0 ? entry.planejamento : null,
        paAtivo: entry.paAtivo > 0 ? entry.paAtivo : null,
        credito: entry.credito > 0 ? entry.credito : null,
        investimentosXP: null, // Future integration
        prunus: entry.prunus > 0 ? entry.prunus : null,
        cartaoXP: null, // Future integration
        previdencia: entry.previdencia > 0 ? entry.previdencia : null,
      }));

      // Apply search filter
      if (options.searchTerm) {
        const term = options.searchTerm.toLowerCase();
        rows = rows.filter((row) => row.clientName.toLowerCase().includes(term));
      }

      // Sort by client name
      rows.sort((a, b) => a.clientName.localeCompare(b.clientName));

      // Calculate metrics
      const metrics: OpportunityMapMetrics = {
        totalClientes: rows.length,
        planejamentoTotal: rows.reduce((sum, r) => sum + (r.planejamento || 0), 0),
        planejamentoCount: rows.filter((r) => r.planejamento !== null).length,
        paAtivoTotal: rows.reduce((sum, r) => sum + (r.paAtivo || 0), 0),
        paAtivoCount: rows.filter((r) => r.paAtivo !== null).length,
        creditoTotal: rows.reduce((sum, r) => sum + (r.credito || 0), 0),
        creditoCount: rows.filter((r) => r.credito !== null).length,
        prunusTotal: rows.reduce((sum, r) => sum + (r.prunus || 0), 0),
        prunusCount: rows.filter((r) => r.prunus !== null).length,
      };

      return { rows, metrics };
    },
  });
}
