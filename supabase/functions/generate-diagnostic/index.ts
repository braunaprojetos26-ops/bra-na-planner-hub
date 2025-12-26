import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategoryScore {
  score: number;
  insight: string;
}

interface DiagnosticResult {
  [categoryKey: string]: CategoryScore;
}

// Helper to get nested value from object using dot notation
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactId } = await req.json();
    
    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'contactId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user ID from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating diagnostic for contact: ${contactId}`);

    // Fetch contact data collection
    const { data: dataCollection, error: dcError } = await supabase
      .from('contact_data_collections')
      .select('data_collection')
      .eq('contact_id', contactId)
      .maybeSingle();

    if (dcError) {
      console.error('Error fetching data collection:', dcError);
      return new Response(
        JSON.stringify({ error: 'Error fetching contact data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dataCollection) {
      return new Response(
        JSON.stringify({ error: 'No data collection found for this contact' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const collectedData = dataCollection.data_collection as Record<string, unknown>;

    // Fetch active diagnostic categories with their rules
    const { data: categories, error: catError } = await supabase
      .from('diagnostic_categories')
      .select(`
        id,
        key,
        name,
        description,
        weight,
        order_position,
        diagnostic_rules!inner(
          evaluation_prompt,
          data_paths
        )
      `)
      .eq('is_active', true)
      .order('order_position');

    if (catError) {
      console.error('Error fetching categories:', catError);
      return new Response(
        JSON.stringify({ error: 'Error fetching diagnostic categories' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No diagnostic categories configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${categories.length} categories to evaluate`);

    // Fetch knowledge base for context
    const { data: knowledge } = await supabase
      .from('assistant_knowledge')
      .select('title, content, category')
      .eq('is_active', true)
      .in('category', ['planejamento', 'diagnostico', 'geral']);

    const knowledgeContext = knowledge
      ? knowledge.map(k => `[${k.category}] ${k.title}: ${k.content}`).join('\n\n')
      : '';

    // Build the evaluation prompt
    const categoryPrompts = categories.map((cat) => {
      const rules = cat.diagnostic_rules as { evaluation_prompt: string; data_paths: string[] }[];
      const rule = rules[0]; // We expect one rule per category
      
      // Extract relevant data for this category
      const relevantData: Record<string, unknown> = {};
      const missingPaths: string[] = [];
      
      if (rule?.data_paths) {
        for (const path of rule.data_paths) {
          const value = getValueByPath(collectedData, path);
          if (value !== undefined && value !== null && value !== '') {
            relevantData[path] = value;
          } else {
            missingPaths.push(path);
          }
        }
      }

      // Log data coverage for debugging
      console.log(`[${cat.key}] Data coverage: ${Object.keys(relevantData).length}/${rule?.data_paths?.length || 0} paths`);
      if (missingPaths.length > 0) {
        console.log(`[${cat.key}] Missing/empty paths: ${missingPaths.join(', ')}`);
      }

      return {
        key: cat.key,
        name: cat.name,
        description: cat.description,
        evaluationPrompt: rule?.evaluation_prompt || '',
        relevantData,
        missingPaths
      };
    });

    const systemPrompt = `Você é um especialista em planejamento financeiro pessoal. 
Sua tarefa é analisar os dados financeiros de um cliente e fornecer um diagnóstico inicial.

IMPORTANTE:
- Dê notas de 0 a 10 para cada categoria
- Forneça insights curtos (máximo 2 frases) sem revelar valores específicos ideais
- Seja honesto mas construtivo
- Se faltar dados para avaliar uma categoria, dê nota 5 e mencione que faltam informações

${knowledgeContext ? `\nBASE DE CONHECIMENTO:\n${knowledgeContext}` : ''}`;

    const userPrompt = `Analise os seguintes dados do cliente e avalie cada categoria:

DADOS DO CLIENTE:
${JSON.stringify(collectedData, null, 2)}

CATEGORIAS PARA AVALIAR:
${categoryPrompts.map(c => `
### ${c.name} (${c.key})
${c.description}
Critério: ${c.evaluationPrompt}
Dados relevantes: ${JSON.stringify(c.relevantData)}${c.missingPaths.length > 0 ? `\n[ATENÇÃO: Dados não informados: ${c.missingPaths.join(', ')}]` : ''}
`).join('\n')}

Use a função evaluate_categories para retornar sua avaliação.`;

    console.log('Calling Lovable AI...');

    // Call Lovable AI with tool calling
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'evaluate_categories',
              description: 'Retorna a avaliação de todas as categorias do diagnóstico financeiro',
              parameters: {
                type: 'object',
                properties: {
                  categories: {
                    type: 'object',
                    description: 'Objeto com a avaliação de cada categoria',
                    additionalProperties: {
                      type: 'object',
                      properties: {
                        score: { 
                          type: 'number', 
                          minimum: 0, 
                          maximum: 10,
                          description: 'Nota de 0 a 10 para a categoria'
                        },
                        insight: { 
                          type: 'string',
                          description: 'Insight curto (máximo 2 frases) sobre a situação do cliente nesta categoria'
                        }
                      },
                      required: ['score', 'insight']
                    }
                  }
                },
                required: ['categories']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'evaluate_categories' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes para o serviço de IA.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error calling AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    console.log('Full AI response:', JSON.stringify(aiData, null, 2));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call found in response');
      console.error('Message content:', aiData.choices?.[0]?.message?.content);
      return new Response(
        JSON.stringify({ error: 'AI did not return expected tool call format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tool call function name:', toolCall.function?.name);
    console.log('Tool call arguments (raw):', toolCall.function?.arguments);

    if (toolCall.function?.name !== 'evaluate_categories') {
      console.error('Unexpected function name:', toolCall.function?.name);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let evaluationResult;
    try {
      evaluationResult = JSON.parse(toolCall.function.arguments);
      console.log('Parsed evaluation result:', JSON.stringify(evaluationResult, null, 2));
    } catch (parseError) {
      console.error('Failed to parse tool arguments:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle both response formats: { categories: {...} } or direct { key: {...} }
    let categoryScores: DiagnosticResult;
    
    if (evaluationResult.categories && typeof evaluationResult.categories === 'object') {
      categoryScores = evaluationResult.categories;
      console.log('Using categories from wrapper object');
    } else {
      // Fallback: assume the result itself is the category scores
      categoryScores = evaluationResult;
      console.log('Using evaluation result directly as category scores');
    }

    console.log('Final category scores:', JSON.stringify(categoryScores));

    // Validate that we have scores
    const expectedCategoryKeys = categories.map(c => c.key);
    const receivedKeys = Object.keys(categoryScores);
    console.log('Expected category keys:', expectedCategoryKeys);
    console.log('Received category keys:', receivedKeys);

    if (receivedKeys.length === 0) {
      console.error('No category scores received from AI');
      return new Response(
        JSON.stringify({ error: 'AI returned empty category scores' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log missing categories
    for (const key of expectedCategoryKeys) {
      if (!categoryScores[key]) {
        console.warn(`Missing score for category: ${key}`);
      }
    }

    // Calculate overall score with weights
    let totalWeight = 0;
    let weightedSum = 0;

    for (const cat of categories) {
      const catScore = categoryScores[cat.key];
      if (catScore && typeof catScore.score === 'number') {
        const weight = Number(cat.weight) || 1;
        totalWeight += weight;
        weightedSum += catScore.score * weight;
        console.log(`[${cat.key}] score=${catScore.score}, weight=${weight}`);
      } else {
        console.warn(`[${cat.key}] No valid score found, catScore:`, catScore);
      }
    }

    const overallScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

    console.log(`Overall score: ${overallScore} (weightedSum=${weightedSum}, totalWeight=${totalWeight})`);

    // Save the diagnostic
    const { data: diagnostic, error: saveError } = await supabase
      .from('contact_diagnostics')
      .insert({
        contact_id: contactId,
        overall_score: overallScore,
        category_scores: categoryScores,
        generated_by: user.id
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving diagnostic:', saveError);
      return new Response(
        JSON.stringify({ error: 'Error saving diagnostic' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Diagnostic saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        diagnostic: {
          id: diagnostic.id,
          overall_score: overallScore,
          category_scores: categoryScores,
          created_at: diagnostic.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-diagnostic:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
