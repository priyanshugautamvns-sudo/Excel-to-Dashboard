import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyDashboard({ message = "No dataset found. Upload a file to generate a dashboard." }: { message?: string }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <Card className="glass-panel">
        <CardContent className="flex flex-col items-center p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <FileSpreadsheet className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Upload a spreadsheet first</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{message}</p>
          <Link href="/" className="mt-6">
            <Button>Go to upload</Button>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
