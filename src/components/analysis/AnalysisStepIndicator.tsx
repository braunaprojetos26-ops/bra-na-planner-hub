import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  shortLabel?: string;
}

interface AnalysisStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  completedSteps?: number[];
}

export function AnalysisStepIndicator({
  steps,
  currentStep,
  onStepClick,
  completedSteps = [],
}: AnalysisStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center w-full py-4">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.includes(index);
        const isPast = index < currentStep;

        return (
          <div key={index} className="flex items-center">
            {/* Step circle and label */}
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all",
                onStepClick && "cursor-pointer hover:opacity-80",
                !onStepClick && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2",
                  isActive && "bg-primary text-primary-foreground border-primary scale-110",
                  isCompleted && "bg-primary text-primary-foreground border-primary",
                  isPast && !isCompleted && "bg-muted text-muted-foreground border-muted",
                  !isActive && !isCompleted && !isPast && "bg-background text-muted-foreground border-border"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium text-center max-w-[80px] leading-tight",
                  isActive && "text-primary",
                  !isActive && "text-muted-foreground"
                )}
              >
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel || step.label}</span>
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 sm:w-16 h-0.5 mx-2 transition-all",
                  index < currentStep ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
