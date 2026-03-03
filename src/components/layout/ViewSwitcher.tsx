import { ArrowLeftRight, LayoutDashboard, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppView } from '@/contexts/AppViewContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const views = [
  { key: 'crm' as const, label: 'Central do Planejador', icon: LayoutDashboard, route: '/' },
  { key: 'planning' as const, label: 'Montagem de Planejamento', icon: Calculator, route: '/planning' },
];

export function ViewSwitcher() {
  const { currentView, switchView } = useAppView();
  const navigate = useNavigate();

  const active = views.find((v) => v.key === currentView) || views[0];
  const ActiveIcon = active.icon;

  const handleSwitch = (view: typeof views[number]) => {
    switchView(view.key);
    navigate(view.route);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
          <ActiveIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{active.label}</span>
          <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {views.map((view) => (
          <DropdownMenuItem
            key={view.key}
            onClick={() => handleSwitch(view)}
            className={currentView === view.key ? 'bg-accent' : ''}
          >
            <view.icon className="mr-2 h-4 w-4" />
            {view.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
