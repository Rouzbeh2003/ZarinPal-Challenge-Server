import type { ReactNode } from "react";
import { findNavigationItem } from "@/lib/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { GlobalFilterProvider, useGlobalFilters } from "@/lib/global-filters";
import { DataState } from "@/components/ui/data-state";
import { Skeleton } from "@/components/ui/skeleton";

type AppShellProps = {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: ReactNode;
};

export function AppShell({ currentPath, onNavigate, children }: AppShellProps) {
  const { authState, retryLogin } = useAuth();

  if (authState.status === "checking") {
    return (
      <div className="flex min-h-dvh flex-col gap-4 bg-background p-8" aria-label="در حال اتصال به سرویس">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (authState.status === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <DataState
          kind="error"
          title="اتصال به سرویس پرداخت برقرار نشد"
          description={authState.message}
          actionLabel="تلاش دوباره"
          onAction={retryLogin}
        />
      </div>
    );
  }

  return (
    <GlobalFilterProvider>
      <ShellInner currentPath={currentPath} onNavigate={onNavigate} children={children} />
    </GlobalFilterProvider>
  );
}

function ShellInner({ currentPath, onNavigate, children }: AppShellProps) {
  const { dateRangePreset, setDateRangePreset, merchantKey, setMerchantKey } = useGlobalFilters();

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 border-l border-border bg-card/40 lg:block">
        <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:mr-64">
        <MobileNav currentPath={currentPath} onNavigate={onNavigate} />
        <TopBar
          dateRangePreset={dateRangePreset}
          onDateRangeChange={setDateRangePreset}
          merchantKey={merchantKey}
          onMerchantChange={setMerchantKey}
        />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <PageHeader currentPath={currentPath} />
          {children}
        </main>
      </div>
    </div>
  );
}

function PageHeader({ currentPath }: { currentPath: string }) {
  const item = findNavigationItem(currentPath);
  if (item === undefined) return null;

  return (
    <header className="mb-6">
      <h1 className="text-xl font-semibold">{item.label}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
    </header>
  );
}