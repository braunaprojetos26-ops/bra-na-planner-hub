import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  maxStars?: number;
  className?: string;
}

export function StarRating({ value, onChange, maxStars = 5, className }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value ?? 0;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(null)}
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              star <= displayValue
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-muted-foreground/40'
            )}
          />
        </button>
      ))}
    </div>
  );
}
