import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VindiPeriod {
  id: number;
  billing_at: string;
  cycle: number;
  start_at: string;
  end_at: string;
  duration: number;
  subscription: { id: number };
  usages: unknown[];
}

interface VindiCharge {
  id: number;
  amount: string;
  status: string;
  due_at: string;
  paid_at: string | null;
  installments: number;
  attempt_count: number;
  next_attempt: string | null;
  print_url: string | null;
  last_transaction?: {
    id: number;
    transaction_type: string;
    status: string;
    amount: string;
    installments: number;
    gateway_message: string | null;
    gateway_response_code: string | null;
    gateway_authorization: string | null;
    gateway_transaction_id: string | null;
    gateway_response_fields: unknown;
    fraud_detector_score: number | null;
    fraud_detector_status: string | null;
    fraud_detector_id: string | null;
    created_at: string;
    gateway: { id: number; connector: string };
    payment_profile: { id: number } | null;
  };
  payment_method: {
    id: number;
    public_name: string;
    name: string;
    code: string;
    type: string;
  };
  gateway_response_fields?: unknown;
  created_at: string;
  updated_at: string;
}

interface VindiBill {
  id: number;
  code: string;
  amount: string;
  installments: number;
  status: string;
  seen_at: string | null;
  billing_at: string | null;
  due_at: string;
  url: string;
  created_at: string;
  updated_at: string;
  charges: VindiCharge[];
  customer: { id: number; name: string; email: string };
  period?: VindiPeriod;
  subscription?: { id: number; status: string };
  payment_profile?: { id: number } | null;
  bill_items: Array<{
    id: number;
    amount: string;
    quantity: number;
    pricing_range_id: number | null;
    description: string | null;
    pricing_schema: { id: number; short_format: string };
    product: { id: number; name: string; code: string };
    discount?: { id: number; amount: string; percentage: string | null };
  }>;
}

interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  status: 'pending' | 'paid' | 'processing' | 'canceled' | 'overdue';
  dueDate: string;
  paidAt: string | null;
  paymentUrl: string | null;
  paymentMethod: string | null;
}

interface PaymentResponse {
  success: boolean;
  isUpToDate: boolean;
  overdueCount: number;
  paidCount: number;
  totalCount: number;
  totalAmount: number;
  paidAmount: number;
  installments: PaymentInstallment[];
  vindiStatus: string | null;
  contractTotalAmount: number;
  contractTotalInstallments: number;
  error?: string;
}

function mapVindiStatus(vindiStatus: string, dueAt: string): PaymentInstallment['status'] {
  const now = new Date();
  const dueDate = new Date(dueAt);
  
  switch (vindiStatus) {
    case 'paid':
      return 'paid';
    case 'pending':
    case 'review':
      return dueDate < now ? 'overdue' : 'pending';
    case 'processing':
    case 'scheduled':
      return 'processing';
    case 'canceled':
    case 'voided':
      return 'canceled';
    default:
      return dueDate < now ? 'overdue' : 'pending';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vindiApiKey = Deno.env.get('VINDI_API_KEY');

    if (!vindiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'VINDI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { contactId } = await req.json();

    if (!contactId) {
      return new Response(
        JSON.stringify({ success: false, error: 'contactId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contracts with Vindi IDs for this contact
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, vindi_subscription_id, vindi_bill_id, vindi_status, installments, installment_value, contract_value, billing_type, custom_data')
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .not('vindi_subscription_id', 'is', null);

    if (contractsError) {
      throw new Error(`Failed to fetch contracts: ${contractsError.message}`);
    }

    if (!contracts || contracts.length === 0) {
      // Check for bills without subscription
      const { data: billContracts } = await supabase
        .from('contracts')
        .select('id, vindi_subscription_id, vindi_bill_id, vindi_status, installments, installment_value, contract_value, billing_type, custom_data')
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .not('vindi_bill_id', 'is', null);

      if (!billContracts || billContracts.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            isUpToDate: true,
            overdueCount: 0,
            paidCount: 0,
            totalCount: 0,
            totalAmount: 0,
            paidAmount: 0,
            installments: [],
            vindiStatus: null,
          } as PaymentResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const allContracts = contracts || [];
    
    // Also check for bill-only contracts
    const { data: billOnlyContracts } = await supabase
      .from('contracts')
      .select('id, vindi_subscription_id, vindi_bill_id, vindi_status, installments, installment_value, contract_value, billing_type, custom_data')
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .is('vindi_subscription_id', null)
      .not('vindi_bill_id', 'is', null);

    if (billOnlyContracts) {
      allContracts.push(...billOnlyContracts);
    }

    const vindiAuth = btoa(`${vindiApiKey}:`);
    const allInstallments: PaymentInstallment[] = [];
    let vindiStatus: string | null = null;

    for (const contract of allContracts) {
      if (contract.vindi_subscription_id) {
        // Fetch bills for subscription
        const billsResponse = await fetch(
          `https://app.vindi.com.br/api/v1/bills?query=subscription_id:${contract.vindi_subscription_id}&sort_by=created_at&sort_order=asc&per_page=100`,
          {
            headers: {
              'Authorization': `Basic ${vindiAuth}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!billsResponse.ok) {
          console.error(`Failed to fetch bills for subscription ${contract.vindi_subscription_id}: ${billsResponse.status}`);
          continue;
        }

        const billsData = await billsResponse.json();
        const bills: VindiBill[] = billsData.bills || [];

        bills.forEach((bill, index) => {
          const charge = bill.charges?.[0];
          const effectiveDueDate = bill.due_at || bill.billing_at || bill.created_at;
          const status = mapVindiStatus(bill.status, effectiveDueDate);
          
          allInstallments.push({
            id: bill.id.toString(),
            installmentNumber: index + 1,
            amount: parseFloat(bill.amount),
            status,
            dueDate: effectiveDueDate,
            paidAt: charge?.paid_at || null,
            paymentUrl: bill.url || null,
            paymentMethod: charge?.payment_method?.public_name || null,
          });
        });

        // Opportunistically save first_payment_at if not yet set
        const firstPaidBill = bills.find(b => b.status === 'paid');
        if (firstPaidBill) {
          const firstCharge = firstPaidBill.charges?.[0];
          const firstPaidAt = firstCharge?.paid_at || firstPaidBill.billing_at || firstPaidBill.due_at || firstPaidBill.created_at;
          if (firstPaidAt) {
            // Update contract if first_payment_at is not yet set
            await supabase
              .from('contracts')
              .update({ first_payment_at: firstPaidAt })
              .eq('id', contract.id)
              .is('first_payment_at', null);
          }
        }

        vindiStatus = contract.vindi_status;
      } else if (contract.vindi_bill_id) {
        // Fetch single bill
        const billResponse = await fetch(
          `https://app.vindi.com.br/api/v1/bills/${contract.vindi_bill_id}`,
          {
            headers: {
              'Authorization': `Basic ${vindiAuth}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!billResponse.ok) {
          console.error(`Failed to fetch bill ${contract.vindi_bill_id}: ${billResponse.status}`);
          continue;
        }

        const billData = await billResponse.json();
        const bill: VindiBill = billData.bill;

        // For single bills with installments (credit card), each charge is an installment
        if (bill.charges && bill.charges.length > 0) {
          bill.charges.forEach((charge, index) => {
            const status = mapVindiStatus(charge.status, charge.due_at);
            
            allInstallments.push({
              id: charge.id.toString(),
              installmentNumber: index + 1,
              amount: parseFloat(charge.amount),
              status,
              dueDate: charge.due_at,
              paidAt: charge.paid_at,
              paymentUrl: charge.print_url || bill.url || null,
              paymentMethod: charge.payment_method?.public_name || null,
            });
          });
        } else {
          // Single charge bill
          const status = mapVindiStatus(bill.status, bill.due_at);
          
          allInstallments.push({
            id: bill.id.toString(),
            installmentNumber: 1,
            amount: parseFloat(bill.amount),
            status,
            dueDate: bill.due_at,
            paidAt: null,
            paymentUrl: bill.url || null,
            paymentMethod: null,
          });
        }

        vindiStatus = contract.vindi_status;
      }
    }

    // Sort by installment number
    allInstallments.sort((a, b) => a.installmentNumber - b.installmentNumber);

    const paidCount = allInstallments.filter(i => i.status === 'paid').length;
    const overdueCount = allInstallments.filter(i => i.status === 'overdue').length;
    const paidAmount = allInstallments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);

    // Use contract data for total amounts/installments instead of just counting Vindi bills
    const contractTotalAmount = allContracts.reduce((sum, c) => sum + Number(c.contract_value || 0), 0);
    
    // Calculate expected total installments from contract data
    const firstBillAmount = allInstallments.length > 0 ? allInstallments[0].amount : 0;
    let contractTotalInstallments = allContracts.reduce((sum, c) => sum + (c.installments || 0), 0);
    
    // If contract doesn't have installments set, calculate from contract_value / bill_amount
    if (contractTotalInstallments === 0 && firstBillAmount > 0) {
      contractTotalInstallments = Math.round(contractTotalAmount / firstBillAmount);
    }
    
    // Use contract-based totals if available, otherwise fall back to Vindi bill count
    const effectiveTotalCount = contractTotalInstallments > 0 ? contractTotalInstallments : allInstallments.length;
    const effectiveTotalAmount = contractTotalAmount > 0 ? contractTotalAmount : allInstallments.reduce((sum, i) => sum + i.amount, 0);

    const response: PaymentResponse = {
      success: true,
      isUpToDate: overdueCount === 0,
      overdueCount,
      paidCount,
      totalCount: effectiveTotalCount,
      totalAmount: effectiveTotalAmount,
      paidAmount,
      installments: allInstallments,
      vindiStatus,
      contractTotalAmount,
      contractTotalInstallments: effectiveTotalCount,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-vindi-payments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
