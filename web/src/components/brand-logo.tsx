import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)} aria-label="Encartê">
    <svg aria-hidden="true" viewBox="0 0 40 40" className="h-9 w-9 shrink-0" fill="none">
      <rect x="2" y="6" width="27" height="31" rx="7" fill="hsl(var(--secondary))" />
      <rect x="10" y="2" width="28" height="32" rx="7" fill="hsl(var(--accent))" />
      <path d="M18 12h12M18 18h9M18 24h5" stroke="hsl(var(--accent-foreground))" strokeWidth="3" strokeLinecap="round" />
      <circle cx="31" cy="29" r="7" fill="hsl(var(--secondary))" />
      <path d="m28 29 2 2 4-4" stroke="hsl(var(--accent-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="text-xl font-bold tracking-tight">Encartê<span className="text-secondary-foreground dark:text-secondary">.</span></span>
  </span>;
}
