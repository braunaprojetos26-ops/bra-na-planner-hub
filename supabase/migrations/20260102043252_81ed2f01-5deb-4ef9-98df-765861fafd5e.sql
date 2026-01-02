-- Insert dashboard_banner configuration into app_config
INSERT INTO public.app_config (key, value, description)
VALUES (
  'dashboard_banner',
  jsonb_build_object(
    'image_url', null,
    'overlay_text', 'O caminho das suas conquistas.',
    'link_url', null,
    'is_active', true
  ),
  'Configuração do banner do dashboard. image_url: URL da imagem de fundo, overlay_text: texto exibido no banner, link_url: link ao clicar no banner, is_active: se o banner está ativo.'
)
ON CONFLICT (key) DO NOTHING;