export function Card({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div
      className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className={`px-6 py-4 border-b border-zinc-800 bg-zinc-900/30 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className={`px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 ${className}`} {...props}>
      {children}
    </div>
  );
}
