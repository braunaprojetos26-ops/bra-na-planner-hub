import { cn } from '@/lib/utils';

const STAGE_COLORS = [
  { value: 'gray', label: 'Cinza', class: 'bg-gray-500' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'cyan', label: 'Ciano', class: 'bg-cyan-500' },
  { value: 'yellow', label: 'Amarelo', class: 'bg-yellow-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'emerald', label: 'Esmeralda', class: 'bg-emerald-500' },
] as const;

interface StageColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function StageColorPicker({ value, onChange }: StageColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAGE_COLORS.map(color => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={cn(
            'w-8 h-8 rounded-full transition-all',
            color.class,
            value === color.value 
              ? 'ring-2 ring-offset-2 ring-primary scale-110' 
              : 'hover:scale-105 opacity-70 hover:opacity-100'
          )}
          title={color.label}
        />
      ))}
    </div>
  );
}

export function getStageColorClass(color: string): string {
  const found = STAGE_COLORS.find(c => c.value === color);
  return found?.class ?? 'bg-gray-500';
}

export { STAGE_COLORS };
