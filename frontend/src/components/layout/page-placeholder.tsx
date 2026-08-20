import { Hammer } from "lucide-react";
import { useGlobalFilters } from "@/lib/global-filters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type PlannedModule = {
  title: string;
  description: string;
};

type PagePlaceholderProps = {
  title: string;
  description: string;
  plannedModules: PlannedModule[];
};

export function PagePlaceholder({ title, description, plannedModules }: PagePlaceholderProps) {
  const { dateRangePreset, merchantKey } = useGlobalFilters();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <Hammer aria-hidden="true" className="size-4 text-primary" />
            {title}
          </CardTitle>
          <Badge variant="secondary">در حال ساخت</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2.5 py-1">بازه: {dateRangePreset}</span>
          <span className="rounded-full border border-border px-2.5 py-1">پذیرنده: {merchantKey}</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {plannedModules.map((module) => (
            <li key={module.title} className="rounded-lg border border-dashed border-border p-4">
              <p className="text-sm font-medium">{module.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}