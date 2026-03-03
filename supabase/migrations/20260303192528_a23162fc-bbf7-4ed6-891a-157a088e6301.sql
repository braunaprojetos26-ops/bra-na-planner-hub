
-- Table to store milestone completion proofs
CREATE TABLE public.milestone_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.goal_milestones(id) ON DELETE CASCADE,
  proof_type TEXT NOT NULL CHECK (proof_type IN ('text', 'image', 'file')),
  text_content TEXT,
  file_path TEXT,
  file_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.milestone_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view proofs for accessible contacts"
ON public.milestone_proofs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.goal_milestones gm
    JOIN public.contacts c ON c.id = gm.contact_id
    WHERE gm.id = milestone_proofs.milestone_id
    AND c.owner_id IN (SELECT public.get_accessible_user_ids(auth.uid()))
  )
);

CREATE POLICY "Users can insert proofs"
ON public.milestone_proofs FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());
