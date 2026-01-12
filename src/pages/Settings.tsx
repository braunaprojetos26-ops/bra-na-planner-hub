import { Settings as SettingsIcon, Link2 } from 'lucide-react';
import { OutlookConnectionCard } from '@/components/settings/OutlookConnectionCard';

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e integrações
        </p>
      </div>

      {/* Integrações */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Integrações</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <OutlookConnectionCard />
        </div>
      </section>
    </div>
  );
}
