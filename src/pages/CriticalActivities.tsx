import { useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useCriticalActivities } from '@/hooks/useCriticalActivities';
import { ActivityCard } from '@/components/critical-activities/ActivityCard';
import { NewActivityModal } from '@/components/critical-activities/NewActivityModal';
import { ActivityDetailModal } from '@/components/critical-activities/ActivityDetailModal';

export default function CriticalActivities() {
  const {
    myActivities,
    myActivitiesLoading,
    allActivities,
    allActivitiesLoading,
    isAdmin,
    createActivity,
    completeAssignment,
  } = useCriticalActivities();

  const [showNewModal, setShowNewModal] = useState(false);
  const [detailActivityId, setDetailActivityId] = useState<string | null>(null);

  const pendingActivities = myActivities.filter((a: any) => a.my_status === 'pending');
  const completedActivities = myActivities.filter((a: any) => a.my_status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Atividades Críticas</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Gerencie e acompanhe atividades distribuídas' : 'Suas atividades críticas pendentes'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Atividade
          </Button>
        )}
      </div>

      {isAdmin ? (
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">Minhas Atividades</TabsTrigger>
            <TabsTrigger value="manage">Gerenciamento</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-4">
            <UserActivitiesView
              pending={pendingActivities}
              completed={completedActivities}
              loading={myActivitiesLoading}
              onComplete={(id) => completeAssignment.mutate(id)}
              isCompleting={completeAssignment.isPending}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            {allActivitiesLoading ? (
              <LoadingSkeleton />
            ) : allActivities.length === 0 ? (
              <EmptyState message="Nenhuma atividade criada ainda." />
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
          </TabsContent>
        </Tabs>
      ) : (
        <UserActivitiesView
          pending={pendingActivities}
          completed={completedActivities}
          loading={myActivitiesLoading}
          onComplete={(id) => completeAssignment.mutate(id)}
          isCompleting={completeAssignment.isPending}
        />
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

function UserActivitiesView({ pending, completed, loading, onComplete, isCompleting }: {
  pending: any[];
  completed: any[];
  loading: boolean;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}) {
  if (loading) return <LoadingSkeleton />;
  if (pending.length === 0 && completed.length === 0) {
    return <EmptyState message="Nenhuma atividade crítica atribuída a você." />;
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Pendentes ({pending.length})</h2>
          <div className="grid gap-4">
            {pending.map((act: any) => (
              <ActivityCard key={act.id} activity={act} onComplete={onComplete} isCompleting={isCompleting} />
            ))}
          </div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Concluídas ({completed.length})</h2>
          <div className="grid gap-4">
            {completed.map((act: any) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
      <p>{message}</p>
    </div>
  );
}
