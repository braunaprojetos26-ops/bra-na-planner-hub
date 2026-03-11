
-- Reset incorrectly completed assignments where user still has pending tasks
UPDATE critical_activity_assignments caa
SET status = 'pending', completed_at = NULL
WHERE caa.status = 'completed'
  AND EXISTS (
    SELECT 1 FROM critical_activities ca WHERE ca.id = caa.activity_id AND ca.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN critical_activities ca ON t.title LIKE '[Atividade Crítica] ' || ca.title || ' - %'
    WHERE ca.id = caa.activity_id
      AND t.assigned_to = caa.user_id
      AND t.status != 'completed'
  );
