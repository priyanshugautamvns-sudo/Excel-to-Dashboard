"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, DatabaseZap, FileSpreadsheet, Loader2, UploadCloud, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { saveDataset } from "@/lib/client-store";
import { validateTabularFile } from "@/lib/file-parser";
import { formatNumber } from "@/lib/utils";
import type { StoredDataset } from "@/lib/types";

type WorkerMessage =
  | { type: "progress"; progress: number; message: string }
  | { type: "complete"; dataset: StoredDataset }
  | { type: "error"; message: string };

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Waiting for spreadsheet");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [useBackend, setUseBackend] = useState(false);

  const processFile = useCallback(
    async (selectedFile: File) => {
      setError(null);
      setFile(selectedFile);
      setProgress(4);
      setProcessing(true);
      setStatus("Validating file");

      try {
        validateTabularFile(selectedFile);
        if (useBackend) {
          setProgress(12);
          setStatus("Uploading to backend for analysis");
          const formData = new FormData();
          formData.append("file", selectedFile);
          const response = await fetch("/api/analyze", {
            method: "POST",
            body: formData
          });
          const json = (await response.json()) as { analysis?: unknown; rows?: unknown; error?: string };
          if (!response.ok) throw new Error(json.error || "Backend analysis failed.");

          setProgress(88);
          setStatus("Preparing dashboard");
          const dataset = json as unknown as StoredDataset;
          await saveDataset(dataset);
          setProgress(100);
          setStatus("Dashboard ready");
          setProcessing(false);
          const target = `/dashboard?id=${dataset.analysis.id}`;
          router.push(target);
          window.setTimeout(() => {
            if (!window.location.pathname.startsWith("/dashboard")) window.location.href = target;
          }, 120);
          return;
        }

        const buffer = await selectedFile.arrayBuffer();
        const worker = new Worker(new URL("../../workers/data-worker.ts", import.meta.url), { type: "module" });

        worker.onmessage = async (event: MessageEvent<WorkerMessage>) => {
          const message = event.data;
          if (message.type === "progress") {
            setProgress(message.progress);
            setStatus(message.message);
          }

          if (message.type === "error") {
            setError(message.message);
            setStatus("Analysis stopped");
            setProcessing(false);
            worker.terminate();
          }

          if (message.type === "complete") {
            setProgress(100);
            setStatus("Dashboard ready");
            await saveDataset(message.dataset);
            worker.terminate();
            setProcessing(false);
            const target = `/dashboard?id=${message.dataset.analysis.id}`;
            router.push(target);
            window.setTimeout(() => {
              if (!window.location.pathname.startsWith("/dashboard")) window.location.href = target;
            }, 120);
          }
        };

        worker.onerror = () => {
          setError("The browser worker failed while processing the file.");
          setProcessing(false);
          worker.terminate();
        };

        worker.postMessage({ fileName: selectedFile.name, buffer }, [buffer]);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to process file.");
        setProcessing(false);
      }
    },
    [router, useBackend]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const selected = event.dataTransfer.files?.[0];
      if (selected) void processFile(selected);
    },
    [processFile]
  );

  const loadDemo = async () => {
    setStatus("Loading demo dataset");
    const response = await fetch("/demo-datasets/retail-growth.csv");
    const blob = await response.blob();
    const demoFile = new File([blob], "retail-growth.csv", { type: "text/csv" });
    await processFile(demoFile);
  };

  return (
    <div className="rounded-lg border border-border bg-card/88 p-3 shadow-panel backdrop-blur">
      <motion.div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex min-h-[350px] flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed p-8 text-center transition ${
          dragging ? "border-primary bg-primary/10" : "border-border bg-secondary/32"
        }`}
        animate={{ scale: dragging ? 1.01 : 1 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) void processFile(selected);
          }}
        />

        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
          {processing ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
          Turn any spreadsheet into a decision dashboard.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          ExcelInsight AI cleans tabular files, detects structure, builds charts, flags risks, and writes an analyst-grade narrative in seconds.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => inputRef.current?.click()} disabled={processing}>
            <FileSpreadsheet className="h-5 w-5" />
            Upload Excel or CSV
          </Button>
          <Button size="lg" variant="outline" onClick={loadDemo} disabled={processing}>
            <DatabaseZap className="h-5 w-5" />
            Launch Demo Dataset
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <input
              type="checkbox"
              checked={useBackend}
              onChange={(event) => setUseBackend(event.target.checked)}
              className="h-4 w-4 accent-teal-500"
              disabled={processing}
            />
            Use backend processing
          </label>
          <span className="max-w-[520px] text-center text-xs leading-5">
            When enabled, the file is uploaded to `/api/analyze`. When disabled, processing runs locally in a browser worker.
          </span>
        </div>

        {file && (
          <div className="mt-7 w-full max-w-2xl rounded-lg border border-border bg-card p-4 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatNumber(file.size / 1024, 1)} KB</p>
              </div>
              {error ? <XCircle className="h-5 w-5 text-rose-500" /> : progress === 100 ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : null}
            </div>
            <Progress value={progress} className="mt-4" />
            <p className="mt-3 text-sm text-muted-foreground">{error ?? status}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
