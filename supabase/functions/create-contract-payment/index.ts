import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactData {
  full_name: string;
  cpf: string;
  rg?: string;
  rg_issuer?: string;
  rg_issue_date?: string;
  birth_date?: string;
  marital_status?: string;
  profession?: string;
  income?: number;
  email: string;
  phone: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  city?: string;
  state?: string;
}

interface ContractRequest {
  contactId: string;
  planType: "novo_planejamento" | "planejamento_pontual";
  planValue: number;
  billingType: "assinatura" | "fatura_avulsa";
  paymentMethodCode: "credit_card" | "pix" | "pix_bank_slip" | "bank_slip_yapay";
  billingDate: string;
  installments?: number;
  startDate: string;
  endDate: string;
  meetingCount: number;
  productId: string;
  contactData: ContactData;
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

function getPaymentMethodLabel(code: string, billingType: string, installments?: number): string {
  if (billingType === "assinatura") {
    return "Assinatura mensal via Cartão de Crédito";
  }
  
  const labels: Record<string, string> = {
    credit_card: installments && installments > 1 
      ? `Cartão de Crédito em ${installments}x` 
      : "Cartão de Crédito à vista",
    pix: "PIX à vista",
    pix_bank_slip: "BolePIX",
    bank_slip_yapay: "Boleto Bancário",
  };
  
  return labels[code] || code;
}

function getMaritalStatusLabel(status: string | undefined): string {
  const labels: Record<string, string> = {
    solteiro: "Solteiro(a)",
    casado: "Casado(a)",
    divorciado: "Divorciado(a)",
    viuvo: "Viúvo(a)",
    uniao_estavel: "União Estável",
  };
  return labels[status || ""] || status || "";
}

async function createClickSignDocument(
  contactData: ContactData,
  contractData: ContractRequest,
  templateKey: string,
  apiKey: string
): Promise<{ documentKey: string; error?: string }> {
  const clicksignUrl = "https://app.clicksign.com/api/v1";
  
  // Build template data with EXACT placeholder names from ClickSign template
  const installmentValue = contractData.installments && contractData.installments > 1
    ? contractData.planValue / contractData.installments
    : contractData.planValue;
  
  const vigenciaContrato = `${formatDate(contractData.startDate)} a ${formatDate(contractData.endDate)}`;
  
  const templateVars = {
    "Nome Completo": contactData.full_name || "",
    "CPF": formatCPF(contactData.cpf),
    "RG": contactData.rg || "",
    "Profissão": contactData.profession || "",
    "Estado Civil": getMaritalStatusLabel(contactData.marital_status),
    "Data de Nascimento": contactData.birth_date ? formatDate(contactData.birth_date) : "",
    "Logradouro": contactData.address ? `${contactData.address}${contactData.address_number ? `, ${contactData.address_number}` : ""}${contactData.address_complement ? ` - ${contactData.address_complement}` : ""}` : "",
    "Cidade": contactData.city || "",
    "Estado": contactData.state || "",
    "CEP": contactData.zip_code || "",
    "E-mail": contactData.email || "",
    "Telefone": formatPhone(contactData.phone),
    "Número de Parcelas": contractData.installments ? String(contractData.installments) : "1",
    "Valor das Parcelas": formatCurrency(installmentValue),
    "Valor do Plano": formatCurrency(contractData.planValue),
    "Valor do Plano por Extenso": formatValueInWords(contractData.planValue),
    "Forma de pagamento": getPaymentMethodLabel(
      contractData.paymentMethodCode, 
      contractData.billingType, 
      contractData.installments
    ),
    "Vigência do Contrato": vigenciaContrato,
    "Número de Reuniões": String(contractData.meetingCount),
  };

  const templateData = {
    document: {
      path: `/Contratos/${contactData.full_name.replace(/\s+/g, "_")}_${Date.now()}.docx`,
      template: {
        data: templateVars
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
      { email: contactData.email, name: contactData.full_name, auths: ["email"], delivery: "email" },
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
  contactData: ContactData,
  contractData: ContractRequest,
  apiKey: string
): Promise<{ customerId: string; billId?: string; subscriptionId?: string; error?: string }> {
  const vindiUrl = "https://app.vindi.com.br/api/v1";
  const authHeader = "Basic " + btoa(apiKey + ":");

  try {
    // Check if customer already exists by email
    let customerId = "";
    
    const searchResponse = await fetch(
      `${vindiUrl}/customers?query=email:${encodeURIComponent(contactData.email)}`,
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
      const customerPayload = {
        name: contactData.full_name,
        email: contactData.email,
        registry_code: contactData.cpf?.replace(/\D/g, "") || "",
        phones: [
          {
            phone_type: "mobile",
            number: contactData.phone?.replace(/\D/g, "") || "",
          }
        ],
        address: {
          street: contactData.address || "",
          number: contactData.address_number || "",
          additional_details: contactData.address_complement || "",
          zipcode: contactData.zip_code?.replace(/\D/g, "") || "",
          neighborhood: "",
          city: contactData.city || "",
          state: contactData.state || "",
          country: "BR",
        },
      };

      console.log("Creating Vindi customer:", JSON.stringify(customerPayload, null, 2));

      const customerResponse = await fetch(
        `${vindiUrl}/customers`,
        {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(customerPayload),
        }
      );

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error("Vindi create customer error:", errorText);
        return { customerId: "", error: `Erro ao criar cliente Vindi: ${errorText}` };
      }

      const customerResult = await customerResponse.json();
      customerId = String(customerResult.customer.id);
      console.log("Vindi customer created:", customerId);
    }

    // Vindi Product IDs (for bills)
    const vindiProductId = contractData.planType === "novo_planejamento" 
      ? 1015472  // Planejamento Completo
      : 1284814; // Planejamento Pontual
    
    // Vindi Plan IDs (for subscriptions)
    const vindiPlanId = contractData.planType === "novo_planejamento"
      ? 290372   // Novo Planejamento financeiro
      : 368991;  // Planejamento Financeiro Pontual

    // Determine if we create a subscription or a bill
    if (contractData.billingType === "assinatura") {
      // Create subscription for recurring payments with product items to set the price
      const subscriptionPayload = {
        customer_id: parseInt(customerId),
        plan_id: vindiPlanId,
        payment_method_code: contractData.paymentMethodCode, // Use actual payment method (credit_card or pix)
        start_at: contractData.billingDate,
        product_items: [
          {
            product_id: vindiProductId,
            pricing_schema: {
              price: contractData.planValue,
              schema_type: "flat"
            }
          }
        ]
      };

      console.log("Creating Vindi subscription:", JSON.stringify(subscriptionPayload, null, 2));

      const subscriptionResponse = await fetch(
        `${vindiUrl}/subscriptions`,
        {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscriptionPayload),
        }
      );

      if (!subscriptionResponse.ok) {
        const errorText = await subscriptionResponse.text();
        console.error("Vindi create subscription error:", errorText);
        return { customerId, error: `Erro ao criar assinatura Vindi: ${errorText}` };
      }

      const subscriptionResult = await subscriptionResponse.json();
      const subscriptionId = String(subscriptionResult.subscription.id);
      console.log("Vindi subscription created:", subscriptionId);

      return { customerId, subscriptionId };
    } else {
      // Create bill for one-time or installment payments
      const productName = contractData.planType === "novo_planejamento" 
        ? "Novo Planejamento Financeiro" 
        : "Planejamento Financeiro Pontual";

      const billPayload: any = {
        customer_id: parseInt(customerId),
        payment_method_code: contractData.paymentMethodCode,
        due_at: contractData.billingDate,
        bill_items: [
          {
            product_id: vindiProductId,
            amount: contractData.planValue,
            quantity: 1,
            description: productName,
          }
        ],
      };

      // For installment payments (credit card only)
      if (contractData.paymentMethodCode === "credit_card" && contractData.installments && contractData.installments > 1) {
        billPayload.installments = contractData.installments;
      }

      console.log("Creating Vindi bill:", JSON.stringify(billPayload, null, 2));

      const billResponse = await fetch(
        `${vindiUrl}/bills`,
        {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(billPayload),
        }
      );

      if (!billResponse.ok) {
        const errorText = await billResponse.text();
        console.error("Vindi create bill error:", errorText);
        return { customerId, error: `Erro ao criar cobrança Vindi: ${errorText}` };
      }

      const billResult = await billResponse.json();
      const billId = String(billResult.bill.id);
      console.log("Vindi bill created:", billId);

      return { customerId, billId };
    }
  } catch (error: unknown) {
    console.error("Vindi API error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { customerId: "", error: `Erro na API Vindi: ${message}` };
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
    if (!contractRequest.contactId || !contractRequest.planType || !contractRequest.planValue || !contractRequest.contactData) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: contactId, planType, planValue, contactData" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate contact data
    if (!contractRequest.contactData.email || !contractRequest.contactData.cpf) {
      return new Response(
        JSON.stringify({ error: "Dados do contato obrigatórios: email, cpf" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // First, update the contact with the provided data
    console.log("Updating contact with new data...");
    const { error: updateError } = await supabase
      .from("contacts")
      .update({
        full_name: contractRequest.contactData.full_name,
        cpf: contractRequest.contactData.cpf,
        rg: contractRequest.contactData.rg || null,
        rg_issuer: contractRequest.contactData.rg_issuer || null,
        rg_issue_date: contractRequest.contactData.rg_issue_date || null,
        birth_date: contractRequest.contactData.birth_date || null,
        marital_status: contractRequest.contactData.marital_status || null,
        profession: contractRequest.contactData.profession || null,
        income: contractRequest.contactData.income || null,
        email: contractRequest.contactData.email,
        phone: contractRequest.contactData.phone,
        zip_code: contractRequest.contactData.zip_code || null,
        address: contractRequest.contactData.address || null,
        address_number: contractRequest.contactData.address_number || null,
        address_complement: contractRequest.contactData.address_complement || null,
        city: contractRequest.contactData.city || null,
        state: contractRequest.contactData.state || null,
      })
      .eq("id", contractRequest.contactId);

    if (updateError) {
      console.error("Error updating contact:", updateError);
      return new Response(
        JSON.stringify({ error: `Erro ao atualizar contato: ${updateError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Contact updated successfully");

    // Create ClickSign document
    const clicksignResult = await createClickSignDocument(
      contractRequest.contactData,
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
      contractRequest.contactData,
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

    // Fetch contact to get owner_id
    const { data: contact } = await supabase
      .from("contacts")
      .select("owner_id")
      .eq("id", contractRequest.contactId)
      .single();

    // Calculate payment details for legacy fields
    let paymentType = "avista";
    let installments = null;
    let installmentValue = null;

    if (contractRequest.billingType === "assinatura") {
      paymentType = "mensal";
    } else if (contractRequest.installments && contractRequest.installments > 1) {
      paymentType = "parcelado";
      installments = contractRequest.installments;
      installmentValue = contractRequest.planValue / contractRequest.installments;
    }

    // Save contract to database
    const contractInsert = {
      contact_id: contractRequest.contactId,
      product_id: contractRequest.productId,
      owner_id: userId || contact?.owner_id,
      contract_value: contractRequest.planValue,
      payment_type: paymentType,
      installments,
      installment_value: installmentValue,
      start_date: contractRequest.startDate,
      end_date: contractRequest.endDate,
      meeting_count: contractRequest.meetingCount,
      plan_type: contractRequest.planType,
      billing_type: contractRequest.billingType,
      billing_date: contractRequest.billingDate,
      payment_method_code: contractRequest.paymentMethodCode,
      clicksign_document_key: clicksignResult.documentKey || null,
      clicksign_status: clicksignResult.documentKey ? "pending" : "error",
      vindi_customer_id: vindiResult.customerId || null,
      vindi_bill_id: vindiResult.billId || null,
      vindi_subscription_id: vindiResult.subscriptionId || null,
      vindi_status: (vindiResult.billId || vindiResult.subscriptionId) ? "pending" : "error",
      calculated_pbs: 0, // Will be calculated separately if needed
      status: "pending",
    };

    console.log("Inserting contract:", JSON.stringify(contractInsert, null, 2));

    const { data: contract2, error: insertError } = await supabase
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

    console.log("Contract created successfully:", contract2.id);

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contract2.id,
        clicksign: {
          documentKey: clicksignResult.documentKey,
          status: clicksignResult.documentKey ? "sent" : "error",
          error: clicksignResult.error,
        },
        vindi: {
          customerId: vindiResult.customerId,
          billId: vindiResult.billId,
          subscriptionId: vindiResult.subscriptionId,
          status: (vindiResult.billId || vindiResult.subscriptionId) ? "sent" : "error",
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
