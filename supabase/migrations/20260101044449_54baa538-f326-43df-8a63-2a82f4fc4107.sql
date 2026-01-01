-- Add WhatsApp metric columns to health_score_snapshots table
ALTER TABLE public.health_score_snapshots 
ADD COLUMN whatsapp_score integer DEFAULT 0,
ADD COLUMN days_since_last_whatsapp integer DEFAULT NULL;