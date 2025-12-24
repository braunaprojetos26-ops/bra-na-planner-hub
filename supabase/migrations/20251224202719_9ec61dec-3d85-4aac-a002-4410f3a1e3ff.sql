-- Create planner_profiles table for "Quem Sou Eu" slide
CREATE TABLE public.planner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  photo_url TEXT,
  professional_title TEXT,
  career_achievements TEXT,
  life_achievements TEXT,
  education TEXT,
  certifications TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for planner_profiles
CREATE POLICY "Users can view own planner profile"
ON public.planner_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planner profile"
ON public.planner_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planner profile"
ON public.planner_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Managers can view their subordinates' profiles
CREATE POLICY "Managers can view accessible planner profiles"
ON public.planner_profiles
FOR SELECT
USING (can_access_user(auth.uid(), user_id));

-- Trigger for updated_at
CREATE TRIGGER update_planner_profiles_updated_at
BEFORE UPDATE ON public.planner_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create institutional_presentations table
CREATE TABLE public.institutional_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.institutional_presentations ENABLE ROW LEVEL SECURITY;

-- RLS policies for institutional_presentations
CREATE POLICY "Authenticated users can view active presentations"
ON public.institutional_presentations
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Superadmin can manage presentations"
ON public.institutional_presentations
FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Trigger for updated_at
CREATE TRIGGER update_institutional_presentations_updated_at
BEFORE UPDATE ON public.institutional_presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for planner photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('planner-photos', 'planner-photos', true);

-- Storage policies for planner-photos
CREATE POLICY "Anyone can view planner photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'planner-photos');

CREATE POLICY "Authenticated users can upload own planner photo"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'planner-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own planner photo"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'planner-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own planner photo"
ON storage.objects
FOR DELETE
USING (bucket_id = 'planner-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage bucket for presentations
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentations', 'presentations', true);

-- Storage policies for presentations
CREATE POLICY "Anyone can view presentations"
ON storage.objects
FOR SELECT
USING (bucket_id = 'presentations');

CREATE POLICY "Superadmin can upload presentations"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'presentations' AND has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can update presentations"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'presentations' AND has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can delete presentations"
ON storage.objects
FOR DELETE
USING (bucket_id = 'presentations' AND has_role(auth.uid(), 'superadmin'));