import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Mapping {
  id?: string;
  rd_product_name: string;
  local_product_id: string;
}

interface LocalProduct {
  id: string;
  name: string;
  category?: { name: string } | null;
}

export function RDProductMappingsEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<Mapping[]>([]);

  const { data: existingMappings, isLoading: loadingMappings } = useQuery({
    queryKey: ['rd-product-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rd_product_mappings')
        .select('id, rd_product_name, local_product_id')
        .order('rd_product_name');
      if (error) throw error;
      return data as Mapping[];
    },
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category:product_categories(name)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as unknown as LocalProduct[];
    },
  });

  useEffect(() => {
    if (existingMappings) {
      setMappings(existingMappings);
    }
  }, [existingMappings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete all existing, then insert all current
      await supabase.from('rd_product_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const validMappings = mappings.filter(m => m.rd_product_name.trim() && m.local_product_id);
      if (validMappings.length > 0) {
        const { error } = await supabase
          .from('rd_product_mappings')
          .insert(validMappings.map(m => ({
            rd_product_name: m.rd_product_name.trim(),
            local_product_id: m.local_product_id,
          })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rd-product-mappings'] });
      toast({ title: 'Mapeamentos salvos!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const addMapping = () => {
    setMappings([...mappings, { rd_product_name: '', local_product_id: '' }]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: keyof Mapping, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  if (loadingMappings || loadingProducts) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mapeamento de Produtos RD → Local</CardTitle>
        <CardDescription>
          Configure como os nomes dos produtos no RD CRM correspondem aos produtos locais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mappings.map((mapping, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="Nome no RD CRM"
              value={mapping.rd_product_name}
              onChange={(e) => updateMapping(index, 'rd_product_name', e.target.value)}
              className="flex-1"
            />
            <span className="text-muted-foreground text-sm">→</span>
            <Select
              value={mapping.local_product_id}
              onValueChange={(v) => updateMapping(index, 'local_product_id', v)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Produto local" />
              </SelectTrigger>
              <SelectContent>
                {(products || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.category?.name ? `(${p.category.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => removeMapping(index)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addMapping}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
