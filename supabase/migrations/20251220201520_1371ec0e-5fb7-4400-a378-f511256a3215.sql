-- Drop existing constraints if they exist, then recreate
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_owner_id_fkey;
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_referred_by_fkey;
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_created_by_fkey;

-- Foreign key: owner_id → profiles(user_id)
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Foreign key: referred_by → contacts(id)
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_referred_by_fkey 
FOREIGN KEY (referred_by) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Foreign key: created_by → profiles(user_id)
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;