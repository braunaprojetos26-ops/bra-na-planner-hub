-- Create table for WhatsApp messages
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('entrada', 'saida')),
  message_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_messages_contact_id ON public.whatsapp_messages(contact_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON public.whatsapp_messages(message_timestamp DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages of contacts they have access to
CREATE POLICY "Users can view messages of accessible contacts"
  ON public.whatsapp_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = whatsapp_messages.contact_id
      AND (
        (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid()))
        OR (c.owner_id IS NOT NULL AND can_access_user(auth.uid(), c.owner_id))
      )
    )
  );

-- System (edge function with service role) can insert messages
CREATE POLICY "System can insert messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (true);