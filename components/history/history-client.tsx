"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Clock, Trash2 } from "lucide-react";
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteDataset, listDatasets } from "@/lib/client-store";
import { formatNumber } from "@/lib/utils";
import type { DatasetAnalysis } from "@/lib/types";

type HistoryItem = Pick<DatasetAnalysis, "id" | "fileName" | "createdAt" | "summary" | "sheetName">;

export function HistoryClient() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    listDatasets()
      .then((data) => setItems(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (!loading && !items.length) return <EmptyDashboard message="No uploaded files are stored yet. The next generated dashboard will appear here." />;

  return (
    <section className="mx-auto max-w-[1100px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-primary">
          <Clock className="h-4 w-4" />
          <span>Upload history</span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Previously uploaded files</h1>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{item.fileName}</h2>
                  {item.sheetName && <Badge variant="outline">{item.sheetName}</Badge>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()} · {formatNumber(item.summary.rows, 0)} rows · {item.summary.columns} columns · quality {item.summary.dataQualityScore}/100
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/dashboard?id=${item.id}`}>
                  <Button variant="primary">
                    <BarChart3 className="h-4 w-4" />
                    Open
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await deleteDataset(item.id);
                    refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
