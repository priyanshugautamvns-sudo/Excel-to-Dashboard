import { AreaChart, Bot, BrainCircuit, FileStack, Gauge, Share2, SlidersHorizontal, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { title: "Smart Type Detection", icon: BrainCircuit, text: "Numeric, categorical, date, boolean, and text fields are profiled automatically." },
  { title: "Auto Dashboarding", icon: AreaChart, text: "Charts are selected from the shape of the data, including time series and correlation views." },
  { title: "AI Data Analyst", icon: Bot, text: "Executive summaries, anomalies, risks, recommendations, and forecast narratives are generated locally." },
  { title: "Advanced Metrics", icon: Gauge, text: "Mean, median, variance, deviation, skewness, kurtosis, outliers, and quality scores are calculated." },
  { title: "Interactive Controls", icon: SlidersHorizontal, text: "Filter, sort, swap chart types, compare segments, and save personalized dashboard layouts." },
  { title: "Export Ready", icon: Share2, text: "Create PDF, PNG, PowerPoint, annotated Excel, and shareable dashboard links." },
  { title: "Large File Path", icon: FileStack, text: "Browser workers keep processing responsive for large CSV and Excel workbooks." },
  { title: "Forecasting", icon: TrendingUp, text: "Time-series fields unlock moving trend lines and directional forecasts." }
];

export function FeatureShowcase() {
  return (
    <section className="mx-auto grid max-w-[1500px] gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <Card key={feature.title} className="glass-panel">
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{feature.text}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
