import { useState, useMemo } from 'react';
import { Check, ChevronDown, Search, UserCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAllActiveUsers } from '@/hooks/useAllActiveUsers';

interface OwnerTransferPickerProps {
  currentOwnerId: string | null;
  currentOwnerName: string | null;
  onTransfer: (newOwnerId: string, newOwnerName: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function OwnerTransferPicker({
  currentOwnerId,
  currentOwnerName,
  onTransfer,
  disabled = false,
  isLoading = false,
}: OwnerTransferPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { data: users = [], isLoading: usersLoading } = useAllActiveUsers();

  const filteredUsers = useMemo(() => {
    const searchLower = search.toLowerCase();
    return users
      .filter((user) => user.user_id !== currentOwnerId)
      .filter((user) => 
        user.full_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
  }, [users, search, currentOwnerId]);

  const handleSelect = (userId: string) => {
    const selectedUser = users.find((u) => u.user_id === userId);
    if (selectedUser) {
      onTransfer(selectedUser.user_id, selectedUser.full_name);
      setOpen(false);
      setSearch('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-medium text-xs hover:text-accent hover:bg-transparent justify-start"
          disabled={disabled || isLoading}
        >
          <span className="flex items-center gap-1">
            {currentOwnerName || 'Não atribuído'}
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar usuário..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {usersLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : filteredUsers.length === 0 ? (
              <CommandEmpty>Nenhum usuário encontrado</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.user_id}
                    value={user.user_id}
                    onSelect={handleSelect}
                    className="cursor-pointer"
                  >
                    <UserCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{user.full_name}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
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
