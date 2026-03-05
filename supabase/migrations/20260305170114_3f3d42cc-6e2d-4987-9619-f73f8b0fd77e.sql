
-- Add budget_group column to cash_flow_categories
ALTER TABLE public.cash_flow_categories 
ADD COLUMN budget_group TEXT NOT NULL DEFAULT 'outros';

-- Set budget groups for all existing categories
UPDATE public.cash_flow_categories SET budget_group = 'moradia' WHERE name IN (
  'Aluguel', 'Condomínio', 'IPTU', 'Financiamento Imobiliário', 'Energia Elétrica',
  'Água / Esgoto', 'Água', 'Gás', 'Internet', 'Telefone / Celular', 'Telefone',
  'TV a Cabo / Streaming', 'Streaming (Netflix, Spotify, etc)', 'Empregada / Diarista',
  'Empregada/Diarista', 'Babá', 'Seguro Residencial', 'Manutenção da Casa',
  'Móveis / Decoração'
);

UPDATE public.cash_flow_categories SET budget_group = 'transporte' WHERE name IN (
  'Combustível', 'Transporte', 'Transporte (Uber/Táxi)', 'Transporte Público',
  'Financiamento de Veículo', 'Seguro do Carro', 'Seguro Carro', 'IPVA', 'Licenciamento',
  'Manutenção do Carro', 'Estacionamento Mensal', 'Transporte Escolar', 'Transporte/Combustível'
);

UPDATE public.cash_flow_categories SET budget_group = 'alimentacao' WHERE name IN (
  'Supermercado', 'Alimentação', 'Alimentação Fora de Casa', 'Feira / Hortifruti',
  'Delivery / Aplicativos de Comida'
);

UPDATE public.cash_flow_categories SET budget_group = 'saude' WHERE name IN (
  'Plano de Saúde', 'Plano Odontológico', 'Farmácia', 'Consultas Médicas',
  'Medicamentos Contínuos', 'Terapia / Psicólogo', 'Dentista', 'Medicina'
);

UPDATE public.cash_flow_categories SET budget_group = 'educacao' WHERE name IN (
  'Escola / Faculdade', 'Escola/Faculdade', 'Curso / Pós-graduação',
  'Material Escolar', 'Livros / Revistas'
);

UPDATE public.cash_flow_categories SET budget_group = 'lazer' WHERE name IN (
  'Lazer', 'Lazer / Entretenimento', 'Viagens', 'Festas / Eventos', 'Hobbies',
  'Clube / Associação', 'Clube'
);

UPDATE public.cash_flow_categories SET budget_group = 'pessoal' WHERE name IN (
  'Academia', 'Academia / Esporte', 'Vestuário', 'Calçados',
  'Cuidados Pessoais (salão, barbearia)', 'Cosméticos / Perfumaria', 'Presentes',
  'Assinaturas Diversas', 'Eletrônicos / Tecnologia', 'Despesas com Pet',
  'Pet (ração/plano)', 'Doações / Caridade', 'Mesada filha',
  'Dízimo / Contribuição Religiosa', 'Dizimo casal',
  'Sindicato / Associação Profissional'
);

UPDATE public.cash_flow_categories SET budget_group = 'dividas' WHERE name IN (
  'Pensão Alimentícia', 'Pensão Alimentícia Paga', 'Parcela de Empréstimo',
  'Parcela de Cartão de Crédito', 'Consórcio', 'Previdência Privada',
  'Seguro de Vida', 'Parcela Financiamento', 'LCI automático banco'
);
