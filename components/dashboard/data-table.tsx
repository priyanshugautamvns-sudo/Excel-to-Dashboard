"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DataRow } from "@/lib/types";

export function DataTable({ rows }: { rows: DataRow[] }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const columns = useMemo(() => Object.keys(rows[0] ?? {}).slice(0, 14), [rows]);
  const visibleRows = useMemo(() => {
    const next = [...rows];
    if (sortKey) {
      next.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const result = typeof av === "number" && typeof bv === "number" ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
        return direction === "asc" ? result : -result;
      });
    }
    return next.slice(0, 100);
  }, [direction, rows, sortKey]);

  const sort = (column: string) => {
    if (sortKey === column) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    setSortKey(column);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cleaned Data Preview</CardTitle>
        <p className="text-sm text-muted-foreground">Showing {visibleRows.length.toLocaleString()} of {rows.length.toLocaleString()} filtered rows.</p>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-border px-3 py-2">
                  <Button variant="ghost" size="sm" className="px-1" onClick={() => sort(column)}>
                    <ArrowDownUp className="h-3.5 w-3.5" />
                    {column}
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={index} className="border-b border-border/50">
                {columns.map((column) => (
                  <td key={column} className="max-w-[220px] truncate px-3 py-3" title={String(row[column] ?? "")}>
                    {String(row[column] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
