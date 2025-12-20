import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type ViaCepLike = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
  message?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function tryViaCep(cleanCep: string): Promise<ViaCepLike | null> {
  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Lovable/1.0",
    },
  });

  console.log("ViaCEP response status:", response.status);

  if (!response.ok) return null;

  const text = await response.text();
  if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) return null;

  const data = JSON.parse(text);
  return data as ViaCepLike;
}

async function tryBrasilApi(cleanCep: string): Promise<ViaCepLike | null> {
  // Fallback público quando o ViaCEP está instável.
  const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Lovable/1.0",
    },
  });

  console.log("BrasilAPI response status:", response.status);

  if (!response.ok) return null;

  const data = await response.json();

  return {
    cep: data.cep ?? cleanCep,
    logradouro: data.street ?? "",
    complemento: "",
    bairro: data.neighborhood ?? "",
    localidade: data.city ?? "",
    uf: data.state ?? "",
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cep } = await req.json();

    const cleanCep = String(cep ?? "").replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      console.log("Invalid CEP format:", cep);
      // Retornamos 200 para evitar FunctionsHttpError no cliente.
      return jsonResponse({ erro: true, message: "CEP inválido" });
    }

    console.log("Fetching address for CEP:", cleanCep);

    const viaCepData = await tryViaCep(cleanCep);
    if (viaCepData && !viaCepData.erro) {
      return jsonResponse(viaCepData);
    }

    console.log("Falling back to BrasilAPI for CEP:", cleanCep);

    const brasilApiData = await tryBrasilApi(cleanCep);
    if (brasilApiData) {
      return jsonResponse(brasilApiData);
    }

    return jsonResponse({ erro: true, message: "Não foi possível buscar o CEP no momento" });
  } catch (error) {
    console.error("Error fetching address:", error);
    // Retornamos 200 para evitar FunctionsHttpError no cliente.
    return jsonResponse({ erro: true, message: "Erro ao buscar CEP" });
  }
});
