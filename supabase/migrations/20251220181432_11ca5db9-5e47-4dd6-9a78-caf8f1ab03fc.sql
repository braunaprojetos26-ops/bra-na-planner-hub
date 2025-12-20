-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Funnel and Stage
  current_funnel_id UUID NOT NULL REFERENCES funnels(id),
  current_stage_id UUID NOT NULL REFERENCES funnel_stages(id),
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Status
  status contact_status NOT NULL DEFAULT 'active',
  lost_at TIMESTAMPTZ,
  lost_from_stage_id UUID REFERENCES funnel_stages(id),
  lost_reason_id UUID REFERENCES lost_reasons(id),
  converted_at TIMESTAMPTZ,
  
  -- Classification
  qualification INTEGER CHECK (qualification >= 1 AND qualification <= 5),
  temperature TEXT CHECK (temperature IN ('cold', 'warm', 'hot')),
  notes TEXT,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for opportunities
CREATE POLICY "Users can view opportunities of accessible contacts"
  ON opportunities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = opportunities.contact_id
      AND (
        (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
        OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
      )
    )
  );

CREATE POLICY "Authenticated users can insert opportunities"
  ON opportunities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update opportunities of accessible contacts"
  ON opportunities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = opportunities.contact_id
      AND (
        (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
        OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
      )
    )
  );

CREATE POLICY "Superadmin can delete opportunities"
  ON opportunities FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'));

-- Create opportunity_history table
CREATE TABLE public.opportunity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_stage_id UUID REFERENCES funnel_stages(id),
  to_stage_id UUID REFERENCES funnel_stages(id),
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for opportunity_history
ALTER TABLE opportunity_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for opportunity_history
CREATE POLICY "Users can view history of accessible opportunities"
  ON opportunity_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      JOIN contacts c ON c.id = o.contact_id
      WHERE o.id = opportunity_history.opportunity_id
      AND (
        (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
        OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
      )
    )
  );

CREATE POLICY "Authenticated users can insert opportunity history"
  ON opportunity_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Remove funnel-related columns from contacts table
ALTER TABLE contacts 
  DROP COLUMN IF EXISTS current_funnel_id,
  DROP COLUMN IF EXISTS current_stage_id,
  DROP COLUMN IF EXISTS stage_entered_at,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS lost_at,
  DROP COLUMN IF EXISTS lost_from_stage_id,
  DROP COLUMN IF EXISTS lost_reason_id,
  DROP COLUMN IF EXISTS converted_at;