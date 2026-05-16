import { UploadZone } from "@/components/upload/upload-zone";
import { FeatureShowcase } from "@/components/home/feature-showcase";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="flex flex-col justify-center rounded-lg border border-border bg-card/80 p-7 shadow-panel backdrop-blur">
            <Badge className="w-fit">Full-stack analytics workspace</Badge>
            <h2 className="mt-6 max-w-3xl text-5xl font-semibold tracking-normal sm:text-6xl">
              ExcelInsight AI
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              A premium SaaS-style application for converting sales, finance, survey, inventory, student, healthcare, research, and marketing files into interactive dashboards.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["100k+", "Rows profiled with worker processing"],
                ["14", "Automatic chart recommendations"],
                ["5", "Dashboard themes"]
              ].map(([value, label]) => (
                <div key={value} className="rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <UploadZone />
        </div>
      </section>
      <FeatureShowcase />
    </>
  );
}
