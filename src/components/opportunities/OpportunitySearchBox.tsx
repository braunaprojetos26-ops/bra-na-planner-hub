import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User } from 'lucide-react';
import { useSearchOpportunities } from '@/hooks/useSearchOpportunities';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function OpportunitySearchBox() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: opportunities, isLoading } = useSearchOpportunities(debouncedTerm);

  const handleSelect = (opportunityId: string) => {
    setOpen(false);
    setSearchTerm('');
    navigate(`/pipeline/${opportunityId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-start gap-2 text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          <span>Buscar negociação...</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite o nome do contato..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {debouncedTerm.length < 2 ? (
              <CommandEmpty>Digite ao menos 2 caracteres para buscar</CommandEmpty>
            ) : isLoading ? (
              <CommandEmpty>Buscando...</CommandEmpty>
            ) : !opportunities || opportunities.length === 0 ? (
              <CommandEmpty>Nenhuma negociação encontrada</CommandEmpty>
            ) : (
              <CommandGroup heading="Negociações">
                {opportunities.map((opp) => (
                  <CommandItem
                    key={opp.id}
                    value={opp.id}
                    onSelect={() => handleSelect(opp.id)}
                    className="flex flex-col items-start gap-1 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{opp.contact?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6 text-sm text-muted-foreground">
                      <span>{opp.current_funnel?.name}</span>
                      <span>→</span>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: opp.current_stage?.color || undefined,
                          color: opp.current_stage?.color || undefined,
                        }}
                      >
                        {opp.current_stage?.name}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
