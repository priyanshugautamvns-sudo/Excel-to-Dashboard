"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Clock, FileText, Home, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/report", label: "Report", icon: FileText },
  { href: "/history", label: "History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen premium-grid">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/84 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-wide sm:text-base">ExcelInsight AI</span>
              <span className="hidden text-xs text-muted-foreground sm:block">Autonomous spreadsheet intelligence</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-lg border border-border/70 bg-card/70 p-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                    active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-lg border border-border/80 bg-card/92 p-1 shadow-panel backdrop-blur-xl md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] text-muted-foreground",
                active && "bg-primary text-primary-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
