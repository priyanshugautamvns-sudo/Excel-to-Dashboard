"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Database, KeyRound, Palette, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardTheme } from "@/lib/types";

type Settings = {
  defaultTheme: DashboardTheme;
  autosaveLayouts: boolean;
  rowPreviewLimit: number;
  enableVoiceSummary: boolean;
  enableStoryMode: boolean;
};

const defaultSettings: Settings = {
  defaultTheme: "dark",
  autosaveLayouts: true,
  rowPreviewLimit: 100,
  enableVoiceSummary: false,
  enableStoryMode: true
};

const key = "excelinsight.settings";

export function SettingsClient() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) setSettings({ ...defaultSettings, ...JSON.parse(raw) });
  }, []);

  const save = () => {
    localStorage.setItem(key, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <section className="mx-auto max-w-[1100px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary">
            <Palette className="h-4 w-4" />
            <span>Customization</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Configure dashboard behavior, personalization defaults, and AI upgrade options.
          </p>
        </div>
        <Button onClick={save}>
          <Save className="h-4 w-4" />
          {saved ? "Saved" : "Save Settings"}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Personalization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow icon={Palette} label="Default theme">
              <select
                value={settings.defaultTheme}
                onChange={(event) => setSettings((current) => ({ ...current, defaultTheme: event.target.value as DashboardTheme }))}
                className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
              >
                {["dark", "glass", "corporate", "neon", "minimal"].map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </SettingRow>
            <SettingRow icon={RefreshCw} label="Autosave layouts">
              <input
                type="checkbox"
                checked={settings.autosaveLayouts}
                onChange={(event) => setSettings((current) => ({ ...current, autosaveLayouts: event.target.checked }))}
                className="h-5 w-5 accent-teal-500"
              />
            </SettingRow>
            <SettingRow icon={Database} label="Preview row limit">
              <input
                type="number"
                min={25}
                max={500}
                value={settings.rowPreviewLimit}
                onChange={(event) => setSettings((current) => ({ ...current, rowPreviewLimit: Number(event.target.value) }))}
                className="h-10 w-28 rounded-lg border border-border bg-card px-3 text-sm"
              />
            </SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow icon={BrainCircuit} label="Storytelling mode">
              <input
                type="checkbox"
                checked={settings.enableStoryMode}
                onChange={(event) => setSettings((current) => ({ ...current, enableStoryMode: event.target.checked }))}
                className="h-5 w-5 accent-teal-500"
              />
            </SettingRow>
            <SettingRow icon={BrainCircuit} label="Voice summary">
              <input
                type="checkbox"
                checked={settings.enableVoiceSummary}
                onChange={(event) => setSettings((current) => ({ ...current, enableVoiceSummary: event.target.checked }))}
                className="h-5 w-5 accent-teal-500"
              />
            </SettingRow>
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <p className="font-medium">Hosted LLM upgrade</p>
                <Badge variant="outline">Optional</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add `OPENAI_API_KEY` and replace the deterministic query route with an LLM prompt grounded in the generated dataset profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function SettingRow({ icon: Icon, label, children }: { icon: typeof Palette; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-primary" />
        <p className="font-medium">{label}</p>
      </div>
      {children}
    </div>
  );
}
