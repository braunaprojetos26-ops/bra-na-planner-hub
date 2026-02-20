-- Add deactivated_at column to profiles for temporal tracking of user activity
ALTER TABLE public.profiles ADD COLUMN deactivated_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient filtering of active/inactive users by date
CREATE INDEX idx_profiles_deactivated_at ON public.profiles (deactivated_at) WHERE deactivated_at IS NOT NULL;

-- Function to deactivate a user: sets is_active=false, records deactivated_at, transfers contacts
CREATE OR REPLACE FUNCTION public.deactivate_user(
  _target_user_id uuid,
  _transfer_to_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller has permission (superadmin or gerente with access)
  IF NOT (
    has_role(auth.uid(), 'superadmin') OR 
    (has_role(auth.uid(), 'gerente') AND can_access_user(auth.uid(), _target_user_id))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to deactivate user';
  END IF;

  -- Prevent self-deactivation
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot deactivate yourself';
  END IF;

  -- Update profile
  UPDATE profiles 
  SET is_active = false, 
      deactivated_at = now()
  WHERE user_id = _target_user_id;

  -- Transfer contacts to the designated user
  UPDATE contacts 
  SET owner_id = _transfer_to_user_id 
  WHERE owner_id = _target_user_id;

  -- Transfer client plans
  UPDATE client_plans 
  SET owner_id = _transfer_to_user_id 
  WHERE owner_id = _target_user_id;
END;
$$;

-- Function to reactivate a user
CREATE OR REPLACE FUNCTION public.reactivate_user(
  _target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller has permission
  IF NOT (
    has_role(auth.uid(), 'superadmin') OR 
    (has_role(auth.uid(), 'gerente') AND can_access_user(auth.uid(), _target_user_id))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to reactivate user';
  END IF;

  UPDATE profiles 
  SET is_active = true, 
      deactivated_at = null
  WHERE user_id = _target_user_id;
END;
$$;