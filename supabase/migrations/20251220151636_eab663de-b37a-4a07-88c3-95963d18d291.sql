-- Enum for user roles (hierarchy-based)
CREATE TYPE public.app_role AS ENUM ('planejador', 'lider', 'supervisor', 'gerente', 'superadmin');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'planejador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- User hierarchy table (who manages whom)
CREATE TABLE public.user_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hierarchy ENABLE ROW LEVEL SECURITY;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_hierarchy_updated_at
  BEFORE UPDATE ON public.user_hierarchy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user has a specific role (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user can access another user's data (based on hierarchy)
CREATE OR REPLACE FUNCTION public.can_access_user(_accessor_id UUID, _target_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accessor_role public.app_role;
  current_id UUID;
  max_depth INT := 10;
  depth INT := 0;
BEGIN
  -- User can always access their own data
  IF _accessor_id = _target_id THEN
    RETURN true;
  END IF;
  
  -- Get accessor's role
  SELECT role INTO accessor_role FROM public.user_roles WHERE user_id = _accessor_id;
  
  -- Superadmin can access everyone
  IF accessor_role = 'superadmin' THEN
    RETURN true;
  END IF;
  
  -- Check hierarchy chain: walk up from target to see if accessor is in the chain
  current_id := _target_id;
  WHILE depth < max_depth LOOP
    SELECT manager_user_id INTO current_id 
    FROM public.user_hierarchy 
    WHERE user_id = current_id;
    
    IF current_id IS NULL THEN
      RETURN false;
    END IF;
    
    IF current_id = _accessor_id THEN
      RETURN true;
    END IF;
    
    depth := depth + 1;
  END LOOP;
  
  RETURN false;
END;
$$;

-- Function to get all users in accessor's scope (including self)
CREATE OR REPLACE FUNCTION public.get_accessible_user_ids(_accessor_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accessor_role public.app_role;
BEGIN
  -- Get accessor's role
  SELECT role INTO accessor_role FROM public.user_roles WHERE user_id = _accessor_id;
  
  -- Superadmin can access everyone
  IF accessor_role = 'superadmin' THEN
    RETURN QUERY SELECT user_id FROM public.profiles;
    RETURN;
  END IF;
  
  -- Return self + all subordinates (recursive)
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    -- Base case: the accessor themselves
    SELECT _accessor_id AS user_id
    UNION
    -- Recursive case: find users who have someone in subordinates as their manager
    SELECT h.user_id
    FROM public.user_hierarchy h
    INNER JOIN subordinates s ON h.manager_user_id = s.user_id
  )
  SELECT user_id FROM subordinates;
END;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view accessible profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.can_access_user(auth.uid(), user_id));

CREATE POLICY "Superadmin can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmin can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view accessible user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.can_access_user(auth.uid(), user_id));

CREATE POLICY "Superadmin can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for user_hierarchy
CREATE POLICY "Users can view accessible hierarchy"
  ON public.user_hierarchy FOR SELECT
  TO authenticated
  USING (public.can_access_user(auth.uid(), user_id));

CREATE POLICY "Superadmin can manage hierarchy"
  ON public.user_hierarchy FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Trigger to auto-create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Assign default role (planejador) - first user becomes superadmin
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'planejador');
  END IF;
  
  -- Create hierarchy entry (no manager initially)
  INSERT INTO public.user_hierarchy (user_id, manager_user_id) VALUES (NEW.id, NULL);
  
  RETURN NEW;
END;
$$;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_hierarchy_user_id ON public.user_hierarchy(user_id);
CREATE INDEX idx_user_hierarchy_manager_id ON public.user_hierarchy(manager_user_id);