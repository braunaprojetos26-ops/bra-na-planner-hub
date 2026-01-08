import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface OnlineUser {
  user_id: string;
  name: string;
  avatar_url?: string;
}

interface OnlineUsersProps {
  users: OnlineUser[];
}

export function OnlineUsers({ users }: OnlineUsersProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Online:</span>
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user) => (
          <Tooltip key={user.user_id}>
            <TooltipTrigger>
              <Avatar className="h-7 w-7 border-2 border-background ring-2 ring-green-500">
                {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                <AvatarFallback className="text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {users.length > 5 && (
          <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
            <span className="text-xs text-muted-foreground">+{users.length - 5}</span>
          </div>
        )}
      </div>
    </div>
  );
}
