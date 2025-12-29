import { Quote, Play } from 'lucide-react';
import type { PlannerFeedback } from '@/hooks/usePlannerFeedbacks';

interface FeedbacksSectionProps {
  feedbacks: PlannerFeedback[];
}

export function FeedbacksSection({ feedbacks }: FeedbacksSectionProps) {
  if (!feedbacks || feedbacks.length === 0) return null;

  return (
    <section className="space-y-8">
      {/* Section Title */}
      <div className="text-center space-y-2">
        <p className="text-amber-600 text-sm tracking-[0.2em] uppercase font-medium">
          O que dizem nossos clientes
        </p>
        <h2 className="text-3xl font-light text-foreground">
          Feedbacks
        </h2>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
      </div>

      {/* Feedbacks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {feedbacks.slice(0, 6).map((feedback) => (
          <div
            key={feedback.id}
            className="bg-card border rounded-xl p-6 space-y-4 relative"
          >
            {/* Quote Icon */}
            <Quote className="w-8 h-8 text-amber-500/20 absolute top-4 right-4" />

            {/* Media */}
            {feedback.media_url && (
              <div className="rounded-lg overflow-hidden">
                {feedback.media_type === 'video' ? (
                  <div className="relative aspect-video bg-muted flex items-center justify-center">
                    <video 
                      src={feedback.media_url} 
                      className="w-full h-full object-cover"
                      controls
                    />
                  </div>
                ) : (
                  <img
                    src={feedback.media_url}
                    alt={`Feedback de ${feedback.client_name}`}
                    className="w-full h-48 object-cover"
                  />
                )}
              </div>
            )}

            {/* Text */}
            {feedback.feedback_text && (
              <p className="text-muted-foreground italic">
                "{feedback.feedback_text}"
              </p>
            )}

            {/* Client Name */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold">
                {feedback.client_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">{feedback.client_name}</p>
                <p className="text-xs text-muted-foreground">Cliente Braúna</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
