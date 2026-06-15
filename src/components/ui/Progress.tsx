interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export function Progress({
  value,
  max = 100,
  className = '',
  barClassName = '',
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  let barColor = 'bg-emerald-500';
  if (percentage < 30) {
    barColor = 'bg-rose-500';
  } else if (percentage < 60) {
    barColor = 'bg-amber-500';
  }

  return (
    <div className={`w-full bg-zinc-800 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor} ${barClassName}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
