import { CircleAlert, DatabaseZap, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

type DataStateKind = "empty" | "error" | "loading";

type DataStateProps = {
  kind: DataStateKind;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

const stateIcons = {
  empty: SearchX,
  error: CircleAlert,
  loading: DatabaseZap,
} as const;

export function DataState({ kind, title, description, actionLabel, onAction }: DataStateProps) {
  const Icon = stateIcons[kind];
  const canShowAction = actionLabel !== undefined && onAction !== undefined;

  return (
    <section className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center" aria-live={kind === "loading" ? "polite" : undefined}>
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className={kind === "loading" ? "animate-pulse" : undefined} />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {canShowAction ? <Button className="mt-5" onClick={onAction} variant="outline">{actionLabel}</Button> : null}
    </section>
  );
}
