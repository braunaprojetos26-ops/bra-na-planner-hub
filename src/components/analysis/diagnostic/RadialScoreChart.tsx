import { useEffect, useState } from 'react';

interface RadialScoreChartProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  animated?: boolean;
}

export function RadialScoreChart({
  score,
  size = 120,
  strokeWidth = 10,
  className = '',
  animated = true,
}: RadialScoreChartProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const [progress, setProgress] = useState(animated ? 0 : score / 10);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animate the score
  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      setProgress(score / 10);
      return;
    }

    const duration = 1000; // 1 second
    const steps = 60;
    const stepDuration = duration / steps;
    const scoreIncrement = score / steps;
    const progressIncrement = (score / 10) / steps;

    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayScore(score);
        setProgress(score / 10);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(scoreIncrement * currentStep * 10) / 10);
        setProgress(progressIncrement * currentStep);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [score, animated]);

  // Calculate stroke dashoffset based on progress
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on score
  const getColor = () => {
    if (score < 4) return 'hsl(var(--destructive))';
    if (score < 7) return 'hsl(var(--warning, 45 93% 47%))';
    return 'hsl(var(--primary))';
  };

  const color = getColor();

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: animated ? 'stroke-dashoffset 0.1s ease-out' : 'none',
          }}
        />
      </svg>
      {/* Score number in center */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ color }}
      >
        <span className="text-2xl font-bold">
          {displayScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
