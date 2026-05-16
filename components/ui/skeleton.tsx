import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-md bg-[linear-gradient(110deg,hsl(var(--muted)),45%,hsl(var(--card)),55%,hsl(var(--muted)))] bg-[length:200%_100%]", className)} />;
}
