import { Suspense } from "react";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardClient />
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <section className="mx-auto max-w-[1500px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-16 w-full max-w-3xl" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-96 w-full" />
    </section>
  );
}
