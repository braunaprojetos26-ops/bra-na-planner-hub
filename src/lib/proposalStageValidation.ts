// Constants for the proposal value validation
export const VENDA_PLANEJAMENTO_FUNNEL_ID = '22222222-2222-2222-2222-222222222222';
export const PROPOSTA_FEITA_STAGE_POSITION = 3;

interface FunnelStage {
  id: string;
  order_position: number;
  funnel_id?: string;
}

/**
 * Check if a stage requires proposal value (Proposta Feita or later in VENDA - PLANEJAMENTO)
 */
export function requiresProposalValue(
  stageId: string,
  funnelId: string,
  stages: FunnelStage[]
): boolean {
  // Only applies to VENDA - PLANEJAMENTO funnel
  if (funnelId !== VENDA_PLANEJAMENTO_FUNNEL_ID) {
    return false;
  }

  const stage = stages.find(s => s.id === stageId);
  if (!stage) return false;

  // Proposta Feita is at position 3, so positions >= 3 require proposal value
  return stage.order_position >= PROPOSTA_FEITA_STAGE_POSITION;
}

/**
 * Check if moving from one stage to another requires proposal value
 */
export function movingToProposalStage(
  toStageId: string,
  funnelId: string,
  stages: FunnelStage[]
): boolean {
  return requiresProposalValue(toStageId, funnelId, stages);
}

/**
 * Check if the opportunity is currently in a "Proposta Feita+" stage
 * (used to prevent clearing proposal value when still in these stages)
 */
export function isInProposalStage(
  currentStageId: string,
  funnelId: string,
  stages: FunnelStage[]
): boolean {
  return requiresProposalValue(currentStageId, funnelId, stages);
}
