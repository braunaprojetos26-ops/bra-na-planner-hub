-- Fix security definer view by setting security_invoker
ALTER VIEW public.training_exam_questions_safe SET (security_invoker = on);