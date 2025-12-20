import { supabase } from "@/integrations/supabase/client";

export interface ViaCepAddress {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function fetchAddressByCep(cep: string): Promise<ViaCepAddress | null> {
  // Remove non-numeric characters
  const cleanCep = cep.replace(/\D/g, '');
  
  if (cleanCep.length !== 8) {
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('lookup-cep', {
      body: { cep: cleanCep }
    });
    
    if (error) {
      console.error('Error invoking lookup-cep function:', error);
      return null;
    }
    
    if (data?.erro) {
      return null;
    }
    
    return data as ViaCepAddress;
  } catch (error) {
    console.error('Error fetching address from ViaCEP:', error);
    return null;
  }
}
