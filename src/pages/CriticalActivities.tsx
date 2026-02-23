import { useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCriticalActivities } from '@/hooks/useCriticalActivities';
import { ActivityCard } from '@/components/critical-activities/ActivityCard';
import { NewActivityModal } from '@/components/critical-activities/NewActivityModal';
import { ActivityDetailModal } from '@/components/critical-activities/ActivityDetailModal';

export default function CriticalActivities() {
  const {
    allActivities,
    allActivitiesLoading,
    createActivity,
  } = useCriticalActivities();

  const [showNewModal, setShowNewModal] = useState(false);
  const [detailActivityId, setDetailActivityId] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Atividades Críticas</h1>
            <p className="text-sm text-muted-foreground">
              Crie e acompanhe atividades distribuídas para a equipe
            </p>
          </div>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {allActivitiesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : allActivities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma atividade crítica criada ainda.</p>
          <p className="text-sm mt-1">Crie uma atividade para distribuir tarefas para sua equipe.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {allActivities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isAdmin
              onViewDetail={setDetailActivityId}
            />
          ))}
        </div>
      )}

      <NewActivityModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSubmit={(data) => {
          createActivity.mutate(data, { onSuccess: () => setShowNewModal(false) });
        }}
        isSubmitting={createActivity.isPending}
      />

      <ActivityDetailModal
        activityId={detailActivityId}
        open={!!detailActivityId}
        onOpenChange={(open) => { if (!open) setDetailActivityId(null); }}
      />
    </div>
  );
}
