import { Menu, Search, X } from "lucide-react";
import { appRoutes, findNavigationItem, navigationSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

type MobileNavProps = {
  currentPath: string;
  onNavigate: (path: string) => void;
};

export function MobileNav({ currentPath, onNavigate }: MobileNavProps) {
  return (
    <div className="relative z-[100] flex h-14 items-center justify-between border-b border-border bg-card/60 px-4 backdrop-blur lg:hidden">
      <DetailsNav currentPath={currentPath} onNavigate={onNavigate} />

      <span className="text-sm font-medium text-muted-foreground">
        {findNavigationItem(currentPath)?.label ?? "داشبورد تحلیل پرداخت"}
      </span>

      <Button asChild variant="outline" size="icon" aria-label="جست‌وجو (به‌زودی)">
        <a href={appRoutes.overview} onClick={(event) => event.preventDefault()}>
          <Search aria-hidden="true" className="size-5" />
        </a>
      </Button>
    </div>
  );
}

function DetailsNav({ currentPath, onNavigate }: MobileNavProps) {
  const { authState } = useAuth();
  const handleClose = () => {
    document.getElementById("mobile-nav-details")?.removeAttribute("open");
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    handleClose();
  };

  return (
    <details
      id="mobile-nav-details"
      className="relative z-[110]"
    >
      <summary
        aria-label="باز کردن منوی ناوبری"
        className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-border bg-transparent text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Menu aria-hidden="true" className="size-5" />
      </summary>

      <nav
        aria-label="ناوبری موبایل"
        className="absolute right-0 top-[calc(100%+0.75rem)] z-[120] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-3 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-1 pb-2">
          <span className="text-sm font-semibold">ناوبری</span>

          <button
            type="button"
            aria-label="بستن منوی ناوبری"
            onClick={handleClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {navigationSections.filter((section) => section.title !== "مدیریت" || (authState.status === "ready" && authState.isSuperuser)).map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">
              {section.title}
            </p>

            {section.items.map((item) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;

              return (
                <a
                  key={item.key}
                  href={item.path}
                  onClick={(event) => {
                    event.preventDefault();
                    handleNavigate(item.path);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "size-4.5 shrink-0",
                      isActive && "text-primary",
                    )}
                  />
                  {item.label}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
    </details>
  );
}
