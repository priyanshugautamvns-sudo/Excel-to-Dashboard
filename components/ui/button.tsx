import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground shadow-glow hover:brightness-105",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/82",
        variant === "ghost" && "text-foreground hover:bg-secondary",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:brightness-105",
        variant === "outline" && "border border-border bg-card hover:bg-secondary",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        size === "icon" && "h-10 w-10 p-0",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
