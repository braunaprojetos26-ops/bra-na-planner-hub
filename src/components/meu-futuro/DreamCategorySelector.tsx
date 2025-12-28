import { 
  Plane, Car, Home, Users, Laptop, GraduationCap, 
  Dumbbell, Briefcase, Heart, Cloud, Target, PiggyBank 
} from "lucide-react";
import { DreamCategory, DREAM_CATEGORIES } from "@/types/dreams";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plane,
  Car,
  Home,
  Users,
  Laptop,
  GraduationCap,
  Dumbbell,
  Briefcase,
  Heart,
  Cloud,
  Target,
  PiggyBank,
};

interface DreamCategorySelectorProps {
  value: DreamCategory | null;
  onChange: (category: DreamCategory) => void;
}

export function DreamCategorySelector({ value, onChange }: DreamCategorySelectorProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {DREAM_CATEGORIES.map((cat) => {
        const IconComponent = iconMap[cat.icon];
        const isSelected = value === cat.value;
        
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all duration-200",
              "hover:border-primary/50 hover:bg-primary/5",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {IconComponent && <IconComponent className="h-5 w-5" />}
            <span className="text-[10px] font-medium text-center leading-tight">
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
