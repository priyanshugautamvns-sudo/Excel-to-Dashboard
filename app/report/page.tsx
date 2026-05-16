import { Suspense } from "react";
import { ReportClient } from "@/components/report/report-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-96 max-w-[1200px]" />}>
      <ReportClient />
    </Suspense>
  );
}
