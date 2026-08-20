import { Zap } from "lucide-react";

export function BrandLogo() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
    >
      <Zap className="size-5" />
    </span>
  );
}