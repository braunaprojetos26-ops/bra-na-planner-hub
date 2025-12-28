-- 1. Criar função para notificar operações quando um novo chamado é aberto
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operations_position TEXT;
  priority_label TEXT;
  department_label TEXT;
  ops_user RECORD;
BEGIN
  -- Mapear departamento para posição de operações
  CASE NEW.department
    WHEN 'investimentos' THEN operations_position := 'operacoes_investimentos';
    WHEN 'administrativo' THEN operations_position := 'operacoes_administrativo';
    WHEN 'treinamentos' THEN operations_position := 'operacoes_treinamentos';
    WHEN 'recursos_humanos' THEN operations_position := 'operacoes_rh';
    WHEN 'marketing' THEN operations_position := 'operacoes_marketing';
    WHEN 'aquisicao_bens' THEN operations_position := 'operacoes_aquisicao_bens';
    WHEN 'patrimonial' THEN operations_position := 'operacoes_patrimonial';
    ELSE operations_position := NULL;
  END CASE;
  
  -- Mapear prioridade para label
  CASE NEW.priority
    WHEN 'low' THEN priority_label := 'Baixa';
    WHEN 'normal' THEN priority_label := 'Normal';
    WHEN 'high' THEN priority_label := 'Alta';
    WHEN 'urgent' THEN priority_label := 'Urgente';
    ELSE priority_label := NEW.priority;
  END CASE;
  
  -- Mapear departamento para label
  CASE NEW.department
    WHEN 'investimentos' THEN department_label := 'Investimentos';
    WHEN 'administrativo' THEN department_label := 'Administrativo';
    WHEN 'treinamentos' THEN department_label := 'Treinamentos';
    WHEN 'recursos_humanos' THEN department_label := 'RH';
    WHEN 'marketing' THEN department_label := 'Marketing';
    WHEN 'aquisicao_bens' THEN department_label := 'Aquisição de Bens';
    WHEN 'patrimonial' THEN department_label := 'Patrimonial';
    ELSE department_label := NEW.department;
  END CASE;
  
  -- Notificar todos os usuários com a posição correspondente
  IF operations_position IS NOT NULL THEN
    FOR ops_user IN 
      SELECT p.user_id FROM public.profiles p 
      WHERE p.position::text = operations_position 
      AND p.is_active = true
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        ops_user.user_id,
        'Novo chamado - ' || department_label,
        'Novo chamado: ' || NEW.title || ' (Prioridade: ' || priority_label || ')',
        'ticket_update',
        '/tickets?id=' || NEW.id::text
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Criar trigger para novos chamados
DROP TRIGGER IF EXISTS notify_on_new_ticket ON public.tickets;
CREATE TRIGGER notify_on_new_ticket
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_ticket();

-- 3. Atualizar função notify_ticket_update para notificação bidirecional
CREATE OR REPLACE FUNCTION public.notify_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  operations_position TEXT;
  ops_user RECORD;
BEGIN
  SELECT * INTO ticket_record FROM public.tickets WHERE id = NEW.ticket_id;
  
  -- Ignorar mensagens internas
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;
  
  -- Se quem enviou NÃO é o criador do ticket → notificar criador (planejador)
  IF NEW.created_by != ticket_record.created_by THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      ticket_record.created_by,
      'Chamado atualizado',
      'Nova resposta no chamado: ' || ticket_record.title,
      'ticket_update',
      '/tickets?id=' || ticket_record.id::text
    );
  END IF;
  
  -- Se quem enviou É o criador do ticket → notificar operações
  IF NEW.created_by = ticket_record.created_by THEN
    -- Se tem responsável atribuído, notificar apenas ele
    IF ticket_record.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        ticket_record.assigned_to,
        'Nova resposta no chamado',
        'O solicitante respondeu ao chamado: ' || ticket_record.title,
        'ticket_update',
        '/tickets?id=' || ticket_record.id::text
      );
    ELSE
      -- Se não tem responsável, notificar todos do departamento
      CASE ticket_record.department
        WHEN 'investimentos' THEN operations_position := 'operacoes_investimentos';
        WHEN 'administrativo' THEN operations_position := 'operacoes_administrativo';
        WHEN 'treinamentos' THEN operations_position := 'operacoes_treinamentos';
        WHEN 'recursos_humanos' THEN operations_position := 'operacoes_rh';
        WHEN 'marketing' THEN operations_position := 'operacoes_marketing';
        WHEN 'aquisicao_bens' THEN operations_position := 'operacoes_aquisicao_bens';
        WHEN 'patrimonial' THEN operations_position := 'operacoes_patrimonial';
        ELSE operations_position := NULL;
      END CASE;
      
      IF operations_position IS NOT NULL THEN
        FOR ops_user IN 
          SELECT p.user_id FROM public.profiles p 
          WHERE p.position::text = operations_position 
          AND p.is_active = true
        LOOP
          INSERT INTO public.notifications (user_id, title, message, type, link)
          VALUES (
            ops_user.user_id,
            'Nova resposta no chamado',
            'O solicitante respondeu ao chamado: ' || ticket_record.title,
            'ticket_update',
            '/tickets?id=' || ticket_record.id::text
          );
        END LOOP;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;