-- Fix 1: Notifications RLS policies
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Leaders can view subordinate notifications" ON public.notifications;

-- INSERT: only service_role (triggers/edge functions) can insert. Authenticated users cannot insert arbitrary notifications.
-- Triggers use SECURITY DEFINER and edge functions use service_role, both bypass RLS.
-- No INSERT policy for authenticated = they cannot insert directly.

-- SELECT: filter by hierarchy
CREATE POLICY "Users can view own and subordinate notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_access_user(auth.uid(), user_id)
);

-- Fix 2: Training exam questions - server-side grading + restrict correct_answer

-- Create secure grading function
CREATE OR REPLACE FUNCTION public.grade_exam_attempt(
  p_attempt_id UUID,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exam_id UUID;
  v_user_id UUID;
  v_module_id UUID;
  v_correct_count INT := 0;
  v_total_count INT := 0;
  v_score NUMERIC;
  v_passed BOOLEAN;
  v_passing_score NUMERIC;
  v_answer RECORD;
  v_correct TEXT;
BEGIN
  SELECT exam_id, user_id INTO v_exam_id, v_user_id
  FROM training_exam_attempts WHERE id = p_attempt_id;

  IF v_exam_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not your attempt';
  END IF;

  SELECT module_id INTO v_module_id FROM training_exams WHERE id = v_exam_id;

  SELECT passing_score INTO v_passing_score FROM training_modules WHERE id = v_module_id;
  v_passing_score := COALESCE(v_passing_score, 70);

  SELECT COUNT(*) INTO v_total_count
  FROM training_exam_questions WHERE exam_id = v_exam_id AND is_active = true;

  IF v_total_count = 0 THEN
    RAISE EXCEPTION 'No questions found';
  END IF;

  FOR v_answer IN SELECT * FROM jsonb_to_recordset(p_answers) AS x(question_id UUID, answer TEXT)
  LOOP
    SELECT correct_answer INTO v_correct
    FROM training_exam_questions
    WHERE id = v_answer.question_id AND exam_id = v_exam_id AND is_active = true;

    IF v_correct IS NOT NULL AND v_correct = v_answer.answer THEN
      v_correct_count := v_correct_count + 1;
    END IF;
  END LOOP;

  v_score := (v_correct_count::NUMERIC / v_total_count) * 100;
  v_passed := v_score >= v_passing_score;

  UPDATE training_exam_attempts
  SET answers = p_answers, score = v_score, passed = v_passed, completed_at = NOW()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('score', v_score, 'passed', v_passed);
END;
$$;

-- Restrict correct_answer visibility
DROP POLICY IF EXISTS "Authenticated users can view active questions" ON public.training_exam_questions;

-- Only trainers and superadmins see full questions (including correct_answer)
CREATE POLICY "Trainers can view all exam questions"
ON public.training_exam_questions FOR SELECT
TO authenticated
USING (
  public.is_trainer(auth.uid())
  OR public.has_role(auth.uid(), 'superadmin')
);

-- Create safe view for students (no correct_answer)
CREATE OR REPLACE VIEW public.training_exam_questions_safe AS
SELECT id, exam_id, question_text, question_type, options, order_position, is_active
FROM public.training_exam_questions
WHERE is_active = true;

GRANT SELECT ON public.training_exam_questions_safe TO authenticated;