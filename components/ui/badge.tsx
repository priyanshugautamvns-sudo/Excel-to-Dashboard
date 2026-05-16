import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "danger" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        variant === "default" && "bg-primary/12 text-primary",
        variant === "success" && "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
        variant === "warning" && "bg-amber-500/14 text-amber-700 dark:text-amber-300",
        variant === "danger" && "bg-rose-500/14 text-rose-700 dark:text-rose-300",
        variant === "outline" && "border border-border text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
