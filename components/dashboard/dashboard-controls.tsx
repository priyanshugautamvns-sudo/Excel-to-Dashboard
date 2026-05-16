"use client";

import { Download, FileDown, FileSpreadsheet, ImageDown, Link2, Palette, Presentation, Save, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ColumnProfile, DashboardTheme } from "@/lib/types";

type DashboardControlsProps = {
  columns: ColumnProfile[];
  filters: Record<string, string>;
  search: string;
  theme: DashboardTheme;
  onSearchChange: (value: string) => void;
  onFilterChange: (column: string, value: string) => void;
  onThemeChange: (theme: DashboardTheme) => void;
  onSaveLayout: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onExportPowerPoint: () => void;
  onShare: () => void;
};

const themes: DashboardTheme[] = ["dark", "glass", "corporate", "neon", "minimal"];

export function DashboardControls({
  columns,
  filters,
  search,
  theme,
  onSearchChange,
  onFilterChange,
  onThemeChange,
  onSaveLayout,
  onExportPng,
  onExportPdf,
  onExportExcel,
  onExportPowerPoint,
  onShare
}: DashboardControlsProps) {
  const filterColumns = columns.filter((column) => (column.type === "category" || column.type === "boolean") && column.topValues?.length).slice(0, 4);

  return (
    <Card className="glass-panel">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search rows"
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none ring-primary/30 focus:ring-4"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <select value={theme} onChange={(event) => onThemeChange(event.target.value as DashboardTheme)} className="h-10 bg-transparent text-sm outline-none">
              {themes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <Button variant="outline" onClick={onSaveLayout}>
            <Save className="h-4 w-4" />
            Save Layout
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {filterColumns.map((column) => (
            <div key={column.name} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <select value={filters[column.name] ?? ""} onChange={(event) => onFilterChange(column.name, event.target.value)} className="h-10 max-w-[210px] bg-transparent text-sm outline-none">
                <option value="">{column.name}: all</option>
                {column.topValues?.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.value}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={onExportPng}>
              <ImageDown className="h-4 w-4" />
              PNG
            </Button>
            <Button variant="outline" onClick={onExportPdf}>
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" onClick={onExportExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={onExportPowerPoint}>
              <Presentation className="h-4 w-4" />
              PPT
            </Button>
            <Button variant="secondary" onClick={onShare}>
              <Link2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="secondary" onClick={onExportPdf}>
              <Download className="h-4 w-4" />
              Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
