import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { appRoutes, findNavigationItem } from "@/lib/navigation";
import { useAuth } from "@/lib/auth";
import { LoginPage } from "@/pages/login-page";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import {
  GlobalFilterProvider,
  useGlobalFilters,
} from "@/lib/global-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AppShellProps = {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: ReactNode;
};

export function AppShell({ currentPath, onNavigate, children }: AppShellProps) {
  const { authState } = useAuth();
  if (authState.status !== "ready") return <LoginPage />;

  return (
    <GlobalFilterProvider>
      <ShellInner currentPath={currentPath} onNavigate={onNavigate} children={children} />
    </GlobalFilterProvider>
  );
}

function ShellInner({ currentPath, onNavigate, children }: AppShellProps) {
  const { dateRangePreset, setDateRangePreset } = useGlobalFilters();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 border-l border-border bg-card/40 lg:block">
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:mr-64">
        <MobileNav currentPath={currentPath} onNavigate={onNavigate} />
        <TopBar
          dateRangePreset={dateRangePreset}
          onDateRangeChange={setDateRangePreset}
          showDateRange={currentPath !== appRoutes.advisor}
        />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <PageHeader currentPath={currentPath} />
          {children}
        </main>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { authState, updateCredentials } = useAuth();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || authState.status !== "ready") return;
    setUsername(authState.username);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }, [open, authState]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!username.trim() || !currentPassword) {
      setError("نام کاربری و رمز عبور فعلی را وارد کنید.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("تکرار رمز عبور جدید یکسان نیست.");
      return;
    }
    setSubmitting(true);
    try {
      await updateCredentials(currentPassword, username.trim(), newPassword || undefined);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("اطلاعات حساب با موفقیت تغییر کرد.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "تغییر اطلاعات انجام نشد.";
      setError(message.includes("400") ? "رمز عبور فعلی درست نیست." : message.includes("409") ? "این نام کاربری قبلاً استفاده شده است." : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold">تنظیمات داشبورد</h2>
            <p className="mt-1 text-sm text-muted-foreground">تنظیمات عمومی نمایش داده‌ها را تغییر دهید.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="بستن تنظیمات" autoFocus>
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <form className="grid gap-4 py-5" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>نام کاربری</span>
            <Input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" dir="ltr" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>رمز عبور فعلی</span>
            <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" dir="ltr" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>رمز عبور جدید <span className="font-normal text-muted-foreground">(اختیاری)</span></span>
            <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" dir="ltr" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            <span>تکرار رمز عبور جدید</span>
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" dir="ltr" disabled={!newPassword} />
          </label>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {success && <p className="text-sm text-emerald-400" role="status">{success}</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "در حال ذخیره..." : "ذخیره تغییرات"}</Button>
          </div>
        </form>
      </section>
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
