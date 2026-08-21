import { LogOut, Settings, Zap } from "lucide-react";
import { navigationSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

type SidebarProps = {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSettings: () => void;
};

export function Sidebar({ currentPath, onNavigate, onOpenSettings }: SidebarProps) {
  const { authState, logout } = useAuth();
  const isSigningOut = authState.status === "signing-out";

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <a
        href="/"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("/");
        }}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5"
        aria-label="بازگشت به نمای کلی"
      >
        <BrandCompact />
      </a>

      <nav aria-label="ناوبری اصلی" className="flex flex-col gap-6">
        {navigationSections.filter((section) => section.title !== "مدیریت" || (authState.status === "ready" && authState.isSuperuser)).map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{section.title}</p>
            {section.items.map((item) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;
              return (
                <a
                  key={item.key}
                  href={item.path}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(item.path);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  title={item.description}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className={cn("size-4.5 shrink-0", isActive && "text-primary")} />
                  {item.label}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex items-center justify-center rounded-lg bg-muted/50 px-3 py-2">
          <Badge variant="outline" className="px-4 py-1.5 text-sm font-semibold">نسخه ۳.۱</Badge>
        </div>
        <Button
          variant="ghost"
          className="justify-start gap-2 text-muted-foreground"
          onClick={onOpenSettings}
          aria-haspopup="dialog"
        >
          <Settings aria-hidden="true" className="size-4" />
          تنظیمات
        </Button>
        <Button
          variant="ghost"
          className="justify-start gap-2 text-muted-foreground hover:text-red-300"
          onClick={() => void logout()}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          ) : (
            <LogOut aria-hidden="true" className="size-4" />
          )}
          {isSigningOut ? "در حال خروج..." : "خروج"}
        </Button>
      </div>
    </div>
  );
}

function BrandCompact() {
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <Zap className="size-5" />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold">زرین‌پال</span>
        <span className="text-xs text-muted-foreground">تحلیل پرداخت</span>
      </span>
    </>
  );
}
