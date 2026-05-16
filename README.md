# ExcelInsight AI

ExcelInsight AI is a full-stack Next.js 15 application that converts Excel and CSV files into interactive dashboards, statistical reports, forecasts, and AI-style business insights.

## Features

- Drag-and-drop upload for `.xlsx`, `.xls`, and `.csv`
- Browser worker processing for responsive large-file analysis
- Multi-sheet Excel awareness
- Automatic cleaning, data type detection, missing value checks, duplicate detection, and outlier detection
- Dataset quality score and complexity score
- Smart chart recommendations across KPI, bar, line, area, pie, scatter, heatmap, histogram, box, radar, funnel, treemap, and Sankey views
- AI Data Analyst panel with executive summaries, anomalies, risks, trends, correlations, and recommendations
- Natural language querying for questions like “show top 5 products” and “predict next month revenue”
- Dashboard themes, chart type switching, widget reorder controls, compact/expanded panels, saved layouts
- Exports to PNG, PDF, annotated Excel, PowerPoint, and shareable links
- History, settings, report, and dashboard pages
- Demo dataset at `public/demo-datasets/retail-growth.csv`

## Tech Stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS, Framer Motion, ShadCN-style local UI primitives
- Recharts, D3.js, Chart.js, Plotly
- SheetJS, PapaParse
- Next API routes for `/api/analyze` and `/api/query`
- IndexedDB for local dashboard storage

## Click here for live Demo 
excel-to-dashboard-pi.vercel.app

## Folder Structure

```text
app/
  api/analyze/route.ts
  api/query/route.ts
  dashboard/page.tsx
  history/page.tsx
  report/page.tsx
  settings/page.tsx
components/
  charts/
  dashboard/
  history/
  home/
  report/
  settings/
  ui/
hooks/
lib/
workers/
public/demo-datasets/
```

## Installation

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

On Windows PowerShell, if `npm` is blocked by execution policy, use:

```bash
npm.cmd install
npm.cmd run dev
```

## Environment Setup

Copy the example file if you plan to add hosted AI later:

```bash
cp .env.example .env.local
```

Current analysis is deterministic and local-first, so no API key is required.

## Testing

```bash
npm run typecheck
npm run build
npm run test
```

Manual flow:

1. Open the home page.
2. Click **Launch Demo Dataset** or upload an Excel/CSV file.
3. Review the generated dashboard, analyst panel, report page, exports, and history entry.

## Deployment

### Vercel

```bash
npm install
npm run build
```

Then import the repo in Vercel. Use the default Next.js framework preset.

### Netlify

Install the Netlify Next.js runtime automatically through the Netlify build image.

```bash
npm install
npm run build
```

Build command: `npm run build`

Publish directory: `.next`

### Render

Create a Web Service with:

```bash
npm install
npm run build
npm run start
```

Set Node version to `20.11.0` or newer.

## Small Upgrade For Better Results

The fastest improvement is to ground a hosted LLM in the generated `DatasetAnalysis` object. Keep the deterministic profiling engine as the source of truth, then send only this compact profile plus selected aggregates to an LLM for richer narrative, domain-specific recommendations, and follow-up questions.

Suggested upgrade path:

1. Add `OPENAI_API_KEY` to `.env.local`.
2. Update `app/api/query/route.ts` to call a hosted model with `analysis`, `question`, and safe aggregate rows.
3. Keep raw row upload local unless the user explicitly chooses cloud analysis.
4. Add a “Use advanced AI” toggle in Settings.

This gives better explanations without sacrificing the current private, fast browser workflow.
