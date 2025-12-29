import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    switch (action) {
      case 'extract_profile':
        return await extractProfileFromPDF(data);
      case 'prepare_meeting':
        return await prepareMeeting(data);
      case 'chat':
        return await handleChat(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in ai-leadership-coach:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function fetchPDFAsBase64(url: string): Promise<string> {
  console.log('Downloading PDF from:', url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  console.log('PDF converted to base64, length:', base64.length);
  return base64;
}

async function extractProfileFromPDF(data: { pdfUrl: string; userId: string }) {
  const { pdfUrl, userId } = data;

  console.log('Extracting profile from PDF:', pdfUrl);

  // Download PDF and convert to base64
  let pdfBase64: string;
  try {
    pdfBase64 = await fetchPDFAsBase64(pdfUrl);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Não foi possível baixar o PDF. Verifique se o arquivo foi enviado corretamente.');
  }

  const systemPrompt = `Você é um especialista em análise de perfis comportamentais DISC/CAPE da plataforma Sólides.
  
Analise o PDF do relatório comportamental e extraia TODAS as informações estruturadas.

IMPORTANTE: Extraia os valores NUMÉRICOS dos perfis DISC (Executor, Comunicador, Planejador, Analista) em percentuais de 0 a 100.

Retorne um objeto JSON com a seguinte estrutura:
{
  "executorScore": <número 0-100 ou null>,
  "comunicadorScore": <número 0-100 ou null>,
  "planejadorScore": <número 0-100 ou null>,
  "analistaScore": <número 0-100 ou null>,
  "energyLevel": "<texto descrevendo nível de energia>",
  "externalDemand": "<texto sobre exigência do meio>",
  "selfConfidence": "<texto sobre autoconfiança>",
  "selfEsteem": "<texto sobre autoestima>",
  "flexibility": "<texto sobre flexibilidade>",
  "autoMotivation": "<texto sobre automotivação>",
  "leadershipStyle": "<descrição do estilo de liderança>",
  "communicationStyle": "<como a pessoa se comunica>",
  "workEnvironment": "<ambiente de trabalho ideal>",
  "decisionMaking": "<como toma decisões>",
  "motivationalFactors": "<o que motiva a pessoa>",
  "distancingFactors": "<o que desmotiva/afasta a pessoa>",
  "strengths": "<pontos fortes>",
  "areasToDevlop": "<áreas para desenvolvimento>",
  "profileDate": "<data do perfil no formato YYYY-MM-DD ou null>"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            { type: "text", text: "Analise este relatório CAPE/Sólides e extraia todas as informações do perfil comportamental." },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw new Error("AI gateway error: " + errorText);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  let extractedData;
  try {
    extractedData = JSON.parse(content);
  } catch {
    console.error("Failed to parse AI response:", content);
    throw new Error("Failed to parse profile data");
  }

  console.log('Extracted profile data:', extractedData);

  return new Response(
    JSON.stringify(extractedData),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function prepareMeeting(data: {
  plannerId: string;
  plannerName: string;
  templateId?: string;
  leaderInputs: {
    problems?: string;
    concerns?: string;
    objectives?: string;
    notes?: string;
  };
}) {
  const { plannerId, plannerName, templateId, leaderInputs } = data;

  // Fetch planner's behavioral profile
  let profileContext = "";
  try {
    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/planner_behavioral_profiles?user_id=eq.${plannerId}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );
    const profiles = await profileResponse.json();
    if (profiles && profiles.length > 0) {
      const p = profiles[0];
      profileContext = `
## Perfil Comportamental DISC de ${plannerName}:
- Executor: ${p.executor_score || 'N/A'}%
- Comunicador: ${p.comunicador_score || 'N/A'}%
- Planejador: ${p.planejador_score || 'N/A'}%
- Analista: ${p.analista_score || 'N/A'}%

### Indicadores:
- Energia: ${p.energy_level || 'N/A'}
- Exigência do Meio: ${p.external_demand || 'N/A'}
- Autoconfiança: ${p.self_confidence || 'N/A'}
- Flexibilidade: ${p.flexibility || 'N/A'}
- Automotivação: ${p.auto_motivation || 'N/A'}

### Características:
- Estilo de Liderança: ${p.leadership_style || 'N/A'}
- Estilo de Comunicação: ${p.communication_style || 'N/A'}
- Fatores Motivacionais: ${p.motivational_factors || 'N/A'}
- Fatores de Distanciamento: ${p.distancing_factors || 'N/A'}
- Pontos Fortes: ${p.strengths || 'N/A'}
- Áreas para Desenvolvimento: ${p.areas_to_develop || 'N/A'}
`;
    }
  } catch (e) {
    console.error('Error fetching profile:', e);
  }

  // Fetch planner's goals
  let goalsContext = "";
  try {
    const goalsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/planner_goals?user_id=eq.${plannerId}&status=eq.active`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );
    const goals = await goalsResponse.json();
    if (goals && goals.length > 0) {
      const sonhos = goals.filter((g: any) => g.goal_type === 'sonho_grande');
      const objetivosCurto = goals.filter((g: any) => g.goal_type === 'objetivo_curto_prazo');
      const objetivosLongo = goals.filter((g: any) => g.goal_type === 'objetivo_longo_prazo');
      
      goalsContext = `
## Sonhos e Objetivos de ${plannerName}:

### Sonhos Grandes:
${sonhos.map((g: any) => `- ${g.title}: ${g.description || ''}`).join('\n') || 'Nenhum cadastrado'}

### Objetivos de Curto Prazo:
${objetivosCurto.map((g: any) => `- ${g.title}: ${g.description || ''} (Meta: ${g.target_date || 'N/A'})`).join('\n') || 'Nenhum cadastrado'}

### Objetivos de Longo Prazo:
${objetivosLongo.map((g: any) => `- ${g.title}: ${g.description || ''} (Meta: ${g.target_date || 'N/A'})`).join('\n') || 'Nenhum cadastrado'}
`;
    }
  } catch (e) {
    console.error('Error fetching goals:', e);
  }

  // Fetch meeting template if provided
  let templateContext = "";
  if (templateId) {
    try {
      const templateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/leadership_meeting_templates?id=eq.${templateId}`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        }
      );
      const templates = await templateResponse.json();
      if (templates && templates.length > 0) {
        templateContext = `
## Modelo de Reunião Selecionado: ${templates[0].name}
${templates[0].template_content}
`;
      }
    } catch (e) {
      console.error('Error fetching template:', e);
    }
  }

  // Fetch leadership knowledge base
  let knowledgeContext = "";
  try {
    const knowledgeResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/leadership_knowledge_base?is_active=eq.true&select=title,content,category`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );
    const knowledge = await knowledgeResponse.json();
    if (knowledge && knowledge.length > 0) {
      knowledgeContext = `
## Base de Conhecimento sobre Liderança:
${knowledge.map((k: any) => `### ${k.title} (${k.category})\n${k.content}`).join('\n\n')}
`;
    }
  } catch (e) {
    console.error('Error fetching knowledge:', e);
  }

  // Build leader inputs context
  let leaderInputsContext = "";
  if (leaderInputs.problems || leaderInputs.concerns || leaderInputs.objectives || leaderInputs.notes) {
    leaderInputsContext = `
## Inputs do Líder para esta reunião:
${leaderInputs.problems ? `### Problemas/Desafios:\n${leaderInputs.problems}` : ''}
${leaderInputs.concerns ? `### Preocupações/Aflições:\n${leaderInputs.concerns}` : ''}
${leaderInputs.objectives ? `### Objetivos desta reunião:\n${leaderInputs.objectives}` : ''}
${leaderInputs.notes ? `### Notas adicionais:\n${leaderInputs.notes}` : ''}
`;
  }

  const systemPrompt = `Você é um coach de liderança especializado na metodologia DISC/CAPE. 
Você ajuda líderes a preparar reuniões 1:1 e entender como lidar com cada colaborador.

Sua tarefa é preparar uma reunião 1:1 personalizada considerando:
1. O perfil comportamental do planejador (DISC)
2. Seus sonhos e objetivos
3. O modelo de reunião selecionado (se houver)
4. Os inputs específicos do líder
5. A base de conhecimento sobre liderança

Você deve:
- Criar uma pauta personalizada para a reunião
- Dar dicas práticas de como abordar cada ponto
- Sugerir perguntas poderosas baseadas no perfil DISC
- Alertar sobre possíveis armadilhas de comunicação com esse perfil
- Recomendar técnicas de liderança apropriadas

Retorne um JSON com a estrutura:
{
  "preparation": "<texto markdown com a preparação completa>",
  "suggestedAgenda": ["<item 1>", "<item 2>", ...],
  "tips": ["<dica 1>", "<dica 2>", ...]
}`;

  const userMessage = `Prepare uma reunião 1:1 com ${plannerName}.

${profileContext}

${goalsContext}

${templateContext}

${leaderInputsContext}

${knowledgeContext}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw new Error("AI gateway error");
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  let preparationData;
  try {
    preparationData = JSON.parse(content);
  } catch {
    preparationData = {
      preparation: content,
      suggestedAgenda: [],
      tips: []
    };
  }

  return new Response(
    JSON.stringify(preparationData),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleChat(data: {
  plannerId: string;
  plannerName: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}) {
  const { plannerId, plannerName, message, conversationHistory = [] } = data;

  // Fetch planner's behavioral profile for context
  let profileContext = "";
  try {
    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/planner_behavioral_profiles?user_id=eq.${plannerId}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );
    const profiles = await profileResponse.json();
    if (profiles && profiles.length > 0) {
      const p = profiles[0];
      profileContext = `
Perfil DISC de ${plannerName}: Executor ${p.executor_score || 0}%, Comunicador ${p.comunicador_score || 0}%, Planejador ${p.planejador_score || 0}%, Analista ${p.analista_score || 0}%.
Pontos fortes: ${p.strengths || 'N/A'}. Áreas de desenvolvimento: ${p.areas_to_develop || 'N/A'}.
Fatores motivacionais: ${p.motivational_factors || 'N/A'}. Fatores de distanciamento: ${p.distancing_factors || 'N/A'}.
`;
    }
  } catch (e) {
    console.error('Error fetching profile:', e);
  }

  const systemPrompt = `Você é um coach de liderança especializado na metodologia DISC/CAPE.
Você ajuda líderes a entender como lidar com seus colaboradores e resolver situações do dia a dia.

${profileContext}

Responda de forma prática e objetiva, sempre considerando o perfil comportamental do planejador.
Use linguagem profissional mas acessível. Seja direto e dê exemplos práticos quando possível.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: message }
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw new Error("AI gateway error");
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  return new Response(
    JSON.stringify({ response: content }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
