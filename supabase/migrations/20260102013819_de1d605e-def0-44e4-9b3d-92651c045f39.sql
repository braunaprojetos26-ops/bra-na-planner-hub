-- 1. Cria tabela flexível de configuração com melhorias
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilita segurança (RLS)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 3. Política para leitura pública (extensão lê sem autenticação)
CREATE POLICY "Allow public read access"
ON public.app_config FOR SELECT
USING (true);

-- 4. Política para superadmin gerenciar configurações
CREATE POLICY "Superadmin can manage app_config"
ON public.app_config FOR ALL
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- 5. Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Insere os seletores atuais do WhatsApp
INSERT INTO public.app_config (key, value, description)
VALUES (
    'whatsapp_selectors',
    '{
        "sidebar": "#side",
        "chatContainer": "#main",
        "messageRow": "div[role=''row'']",
        "messageOut": ".message-out",
        "messageIn": ".message-in",
        "copyableText": ".copyable-text",
        "headerTitle": "header span[dir=''auto'']",
        "dataIdAttr": "data-id",
        "textStrategies": [
            ".copyable-text span._ao3e",
            ".copyable-text span",
            ".copyable-text"
        ]
    }'::jsonb,
    'Seletores CSS para a extensão Chrome do WhatsApp. Atualize aqui quando o WhatsApp mudar o layout.'
) ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();