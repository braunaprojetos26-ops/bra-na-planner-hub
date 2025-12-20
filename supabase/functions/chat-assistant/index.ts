import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MEETING_MINUTES_TEMPLATE = `
Quando o usuário colar uma transcrição de reunião, elabore uma ata profissional seguindo EXATAMENTE este modelo:

---
**Assuntos Discutidos**

✅ **Estratégias para economia e investimentos:** [parágrafo narrativo com resumo das estratégias discutidas, incluindo valores, produtos, decisões e lógica por trás das recomendações].

✅ **Próximos passos:** [parágrafo narrativo com os direcionamentos acordados, próximos temas e ações futuras].

**Observações Finais**

[Parágrafo conciso com tom positivo e profissional, reforçando a evolução do cliente e a consistência do plano].

**Tarefas**

*Tarefas do Cliente:*
[Tarefa 1]: [Descrição]
[Tarefa 2]: [Descrição]

*Tarefas do Planejador:*
[Tarefa 1]: [Descrição]
[Tarefa 2]: [Descrição]
---

DIRETRIZES PARA A ATA:
- Linguagem objetiva, técnica e profissional
- Use parágrafos concisos e narrativos (NÃO use bullet points, exceto nas tarefas)
- Foco em clareza, pragmatismo e síntese
- Priorize informações estratégicas: valores, prazos, decisões
- Tom executivo e direto
- Se identificar o nome do cliente na transcrição, mencione-o
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch knowledge base from database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: knowledgeBase, error: kbError } = await supabase
      .from("assistant_knowledge")
      .select("category, title, content")
      .eq("is_active", true)
      .order("category");

    if (kbError) {
      console.error("Error fetching knowledge base:", kbError);
    }

    // Build knowledge context
    let knowledgeContext = "";
    if (knowledgeBase && knowledgeBase.length > 0) {
      const grouped = knowledgeBase.reduce((acc: Record<string, any[]>, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});

      const categoryLabels: Record<string, string> = {
        processo: "📋 PROCESSOS INTERNOS",
        faq: "❓ PERGUNTAS FREQUENTES",
        linguagem: "🗣️ LINGUAGEM E TOM",
        regra: "📜 REGRAS E POLÍTICAS",
      };

      for (const [category, items] of Object.entries(grouped)) {
        knowledgeContext += `\n\n${categoryLabels[category] || category.toUpperCase()}:\n`;
        for (const item of items as any[]) {
          knowledgeContext += `\n### ${item.title}\n${item.content}\n`;
        }
      }
    }

    // Build system prompt based on type
    let systemPrompt = `Você é o Assistente Brauna, um chatbot interno exclusivo para planejadores financeiros da Brauna.

⚠️ REGRAS OBRIGATÓRIAS:
- Você APENAS responde sobre processos internos da Brauna, planejamento financeiro e assuntos profissionais relacionados ao trabalho
- NÃO responda sobre assuntos externos como política, esportes, entretenimento, notícias, etc.
- Se perguntarem algo fora do escopo, responda educadamente: "Desculpe, só posso ajudar com assuntos relacionados aos processos internos da Brauna e planejamento financeiro. Como posso ajudá-lo com isso?"
- Seja sempre profissional, objetivo e prestativo
- Use linguagem clara e técnica quando apropriado
`;

    if (knowledgeContext) {
      systemPrompt += `\n\n📚 BASE DE CONHECIMENTO DA BRAUNA:\n${knowledgeContext}`;
    }

    if (type === "meeting") {
      systemPrompt += `\n\n📋 MODO GERAÇÃO DE ATA:\n${MEETING_MINUTES_TEMPLATE}

IMPORTANTE: Ao final da sua resposta, em uma linha separada, tente identificar o cliente mencionado na transcrição e retorne APENAS esta linha no formato:
[CLIENTE_ID: Nome do Cliente | Código: CXX (se mencionado) | Confiança: alta/média/baixa]

Se não conseguir identificar o cliente, não inclua esta linha.`;
    }

    console.log("Processing chat request, type:", type);
    console.log("Knowledge base items:", knowledgeBase?.length || 0);

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
