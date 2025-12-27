import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContractRequest {
  contactId: string;
  planType: "novo_planejamento" | "planejamento_pontual";
  planValue: number;
  paymentMethod: "pix" | "recorrente" | "parcelado";
  installments?: number;
  startDate: string;
  endDate: string;
  meetingCount: number;
  productId: string;
}

// Convert number to Brazilian currency in words
function numberToWords(num: number): string {
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (num === 0) return "zero";
  if (num === 100) return "cem";

  let words = "";
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands === 1) {
      words += "mil";
    } else {
      words += numberToWords(thousands) + " mil";
    }
    num %= 1000;
    if (num > 0) words += " e ";
  }
  
  if (num >= 100) {
    words += hundreds[Math.floor(num / 100)];
    num %= 100;
    if (num > 0) words += " e ";
  }
  
  if (num >= 20) {
    words += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) words += " e ";
  } else if (num >= 10) {
    words += teens[num - 10];
    num = 0;
  }
  
  if (num > 0) {
    words += units[num];
  }

  return words.trim();
}

function formatValueInWords(value: number): string {
  const intPart = Math.floor(value);
  const centPart = Math.round((value - intPart) * 100);
  
  let result = numberToWords(intPart) + " reais";
  if (centPart > 0) {
    result += " e " + numberToWords(centPart) + " centavos";
  }
  
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

function formatCPF(cpf: string | null): string {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function createClickSignDocument(
  contact: any,
  contractData: ContractRequest,
  templateKey: string,
  apiKey: string
): Promise<{ documentKey: string; error?: string }> {
  const clicksignUrl = "https://app.clicksign.com/api/v1";
  
  // Build template data
  const templateData = {
    document: {
      path: `/Contratos/${contact.full_name.replace(/\s+/g, "_")}_${Date.now()}.docx`,
      template: {
        data: {
          nome_cliente: contact.full_name || "",
          cpf_cliente: formatCPF(contact.cpf),
          rg_cliente: contact.rg || "",
          orgao_expedidor: contact.rg_issuer || "",
          data_expedicao: contact.rg_issue_date ? formatDate(contact.rg_issue_date) : "",
          email_cliente: contact.email || "",
          telefone_cliente: formatPhone(contact.phone),
          endereco_cliente: contact.address || "",
          numero_endereco: contact.address_number || "",
          complemento_endereco: contact.address_complement || "",
          cep_cliente: contact.zip_code || "",
          cidade_cliente: contact.city || "",
          estado_cliente: contact.state || "",
          valor_contrato: formatCurrency(contractData.planValue),
          valor_por_extenso: formatValueInWords(contractData.planValue),
          data_inicio: formatDate(contractData.startDate),
          data_fim: formatDate(contractData.endDate),
          quantidade_reunioes: String(contractData.meetingCount),
          forma_pagamento: contractData.paymentMethod === "pix" 
            ? "PIX à vista" 
            : contractData.paymentMethod === "recorrente" 
              ? "Recorrente mensal"
              : `Parcelado em ${contractData.installments}x`,
        }
      }
    }
  };

  console.log("Creating ClickSign document with template data:", JSON.stringify(templateData, null, 2));

  try {
    // Create document from template
    const createResponse = await fetch(
      `${clicksignUrl}/templates/${templateKey}/documents?access_token=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("ClickSign create document error:", errorText);
      return { documentKey: "", error: `Erro ao criar documento: ${errorText}` };
    }

    const docResult = await createResponse.json();
    const documentKey = docResult.document.key;
    console.log("Document created with key:", documentKey);

    // Add signatories - client first
    const signatories = [
      { email: contact.email, name: contact.full_name, auths: ["email"], delivery: "email" },
      { email: "thiago.maran@braunaplanejamento.com.br", name: "Thiago Maran", auths: ["email"], delivery: "email" },
      { email: "adm@braunaplanejamento.com.br", name: "Administrativo Braúna", auths: ["email"], delivery: "email" },
      { email: "gabriel.serrano@braunaplanejamento.com.br", name: "Gabriel Serrano", auths: ["email"], delivery: "email" },
    ];

    for (const signer of signatories) {
      // Create signer
      const signerResponse = await fetch(
        `${clicksignUrl}/signers?access_token=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signer: {
              email: signer.email,
              name: signer.name,
              auths: signer.auths,
              delivery: signer.delivery,
            }
          }),
        }
      );

      if (!signerResponse.ok) {
        const errorText = await signerResponse.text();
        console.error(`ClickSign create signer error for ${signer.email}:`, errorText);
        continue;
      }

      const signerResult = await signerResponse.json();
      const signerKey = signerResult.signer.key;
      console.log(`Signer created: ${signer.email} with key: ${signerKey}`);

      // Add signer to document
      const listResponse = await fetch(
        `${clicksignUrl}/lists?access_token=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            list: {
              document_key: documentKey,
              signer_key: signerKey,
              sign_as: "sign",
            }
          }),
        }
      );

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error(`ClickSign add to list error for ${signer.email}:`, errorText);
      } else {
        console.log(`Signer ${signer.email} added to document`);
      }
    }

    // Send document for signing
    const notifyResponse = await fetch(
      `${clicksignUrl}/documents/${documentKey}/notifications?access_token=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Por favor, assine o contrato de planejamento financeiro." }),
      }
    );

    if (!notifyResponse.ok) {
      console.warn("ClickSign notification warning:", await notifyResponse.text());
    } else {
      console.log("Document sent for signing");
    }

    return { documentKey };
  } catch (error: unknown) {
    console.error("ClickSign API error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { documentKey: "", error: `Erro na API ClickSign: ${message}` };
  }
}

async function createVindiPayment(
  contact: any,
  contractData: ContractRequest,
  apiKey: string
): Promise<{ customerId: string; billId: string; error?: string }> {
  const vindiUrl = "https://app.vindi.com.br/api/v1";
  const authHeader = "Basic " + btoa(apiKey + ":");

  try {
    // Check if customer already exists by email
    let customerId = "";
    
    const searchResponse = await fetch(
      `${vindiUrl}/customers?query=email:${encodeURIComponent(contact.email)}`,
      {
        method: "GET",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.customers && searchResult.customers.length > 0) {
        customerId = String(searchResult.customers[0].id);
        console.log("Found existing Vindi customer:", customerId);
      }
    }

    // Create customer if not found
    if (!customerId) {
      const customerData = {
        name: contact.full_name,
        email: contact.email,
        registry_code: contact.cpf?.replace(/\D/g, "") || "",
        phones: [
          {
            phone_type: "mobile",
            number: contact.phone?.replace(/\D/g, "") || "",
          }
        ],
        address: {
          street: contact.address || "",
          number: contact.address_number || "",
          additional_details: contact.address_complement || "",
          zipcode: contact.zip_code?.replace(/\D/g, "") || "",
          neighborhood: "",
          city: contact.city || "",
          state: contact.state || "",
          country: "BR",
        },
      };

      console.log("Creating Vindi customer:", JSON.stringify(customerData, null, 2));

      const customerResponse = await fetch(
        `${vindiUrl}/customers`,
        {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(customerData),
        }
      );

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error("Vindi create customer error:", errorText);
        return { customerId: "", billId: "", error: `Erro ao criar cliente Vindi: ${errorText}` };
      }

      const customerResult = await customerResponse.json();
      customerId = String(customerResult.customer.id);
      console.log("Vindi customer created:", customerId);
    }

    // Determine product ID based on plan type
    // These would be the actual Vindi product IDs
    const productName = contractData.planType === "novo_planejamento" 
      ? "Novo Planejamento Financeiro" 
      : "Planejamento Financeiro Pontual";

    // Create bill
    const billData: any = {
      customer_id: parseInt(customerId),
      payment_method_code: "bank_slip", // Will allow client to choose at payment time
      bill_items: [
        {
          product_id: null, // Will use product code instead
          product_code: contractData.planType === "novo_planejamento" ? "NPF" : "PFP",
          amount: contractData.planValue,
          quantity: 1,
          description: productName,
        }
      ],
    };

    // For installment payments
    if (contractData.paymentMethod === "parcelado" && contractData.installments && contractData.installments > 1) {
      billData.installments = contractData.installments;
    }

    console.log("Creating Vindi bill:", JSON.stringify(billData, null, 2));

    const billResponse = await fetch(
      `${vindiUrl}/bills`,
      {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billData),
      }
    );

    if (!billResponse.ok) {
      const errorText = await billResponse.text();
      console.error("Vindi create bill error:", errorText);
      return { customerId, billId: "", error: `Erro ao criar cobrança Vindi: ${errorText}` };
    }

    const billResult = await billResponse.json();
    const billId = String(billResult.bill.id);
    console.log("Vindi bill created:", billId);

    return { customerId, billId };
  } catch (error: unknown) {
    console.error("Vindi API error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { customerId: "", billId: "", error: `Erro na API Vindi: ${message}` };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clicksignApiKey = Deno.env.get("CLICKSIGN_API_KEY")!;
    const clicksignTemplateKey = Deno.env.get("CLICKSIGN_TEMPLATE_KEY")!;
    const vindiApiKey = Deno.env.get("VINDI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const contractRequest: ContractRequest = await req.json();
    console.log("Received contract request:", JSON.stringify(contractRequest, null, 2));

    // Validate required fields
    if (!contractRequest.contactId || !contractRequest.planType || !contractRequest.planValue) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: contactId, planType, planValue" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch contact details
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contractRequest.contactId)
      .single();

    if (contactError || !contact) {
      console.error("Contact fetch error:", contactError);
      return new Response(
        JSON.stringify({ error: "Contato não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Contact found:", contact.full_name);

    // Validate contact has email
    if (!contact.email) {
      return new Response(
        JSON.stringify({ error: "Contato precisa ter email cadastrado para receber contrato e cobrança" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create ClickSign document
    const clicksignResult = await createClickSignDocument(
      contact,
      contractRequest,
      clicksignTemplateKey,
      clicksignApiKey
    );

    if (clicksignResult.error) {
      console.error("ClickSign error:", clicksignResult.error);
      // Continue anyway, will save partial result
    }

    // Create Vindi payment
    const vindiResult = await createVindiPayment(
      contact,
      contractRequest,
      vindiApiKey
    );

    if (vindiResult.error) {
      console.error("Vindi error:", vindiResult.error);
      // Continue anyway, will save partial result
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Calculate payment details
    let paymentType = "avista";
    let installments = null;
    let installmentValue = null;

    if (contractRequest.paymentMethod === "parcelado" && contractRequest.installments) {
      paymentType = "parcelado";
      installments = contractRequest.installments;
      installmentValue = contractRequest.planValue / contractRequest.installments;
    } else if (contractRequest.paymentMethod === "recorrente") {
      paymentType = "mensal";
    }

    // Save contract to database
    const contractInsert = {
      contact_id: contractRequest.contactId,
      product_id: contractRequest.productId,
      owner_id: userId || contact.owner_id,
      contract_value: contractRequest.planValue,
      payment_type: paymentType,
      installments,
      installment_value: installmentValue,
      start_date: contractRequest.startDate,
      end_date: contractRequest.endDate,
      meeting_count: contractRequest.meetingCount,
      plan_type: contractRequest.planType,
      clicksign_document_key: clicksignResult.documentKey || null,
      clicksign_status: clicksignResult.documentKey ? "pending" : "error",
      vindi_customer_id: vindiResult.customerId || null,
      vindi_bill_id: vindiResult.billId || null,
      vindi_status: vindiResult.billId ? "pending" : "error",
      calculated_pbs: 0, // Will be calculated separately if needed
      status: "pending",
    };

    console.log("Inserting contract:", JSON.stringify(contractInsert, null, 2));

    const { data: contract, error: insertError } = await supabase
      .from("contracts")
      .insert(contractInsert)
      .select()
      .single();

    if (insertError) {
      console.error("Contract insert error:", insertError);
      return new Response(
        JSON.stringify({ error: `Erro ao salvar contrato: ${insertError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Contract created successfully:", contract.id);

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contract.id,
        clicksign: {
          documentKey: clicksignResult.documentKey,
          status: clicksignResult.documentKey ? "sent" : "error",
          error: clicksignResult.error,
        },
        vindi: {
          customerId: vindiResult.customerId,
          billId: vindiResult.billId,
          status: vindiResult.billId ? "sent" : "error",
          error: vindiResult.error,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: `Erro interno: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
