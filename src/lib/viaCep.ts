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
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data: ViaCepAddress = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching address from ViaCEP:', error);
    return null;
  }
}
