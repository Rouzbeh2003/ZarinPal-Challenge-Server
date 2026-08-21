import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, BarChart3, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const { authState, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");
  const isLoading = authState.status === "signing-in";
  const error = validationError || (authState.status === "error" ? authState.message : "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) return setValidationError("نام کاربری و رمز عبور را وارد کنید.");
    setValidationError("");
    await login(username.trim(), password);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0b1220] text-foreground" dir="rtl">
      <div className="pointer-events-none absolute inset-0 login-grid opacity-40" />
      <div className="pointer-events-none absolute -right-40 -top-40 size-[32rem] rounded-full bg-primary/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-48 left-10 size-[30rem] rounded-full bg-sky-500/10 blur-[110px]" />

      <div className="relative mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden flex-col justify-between border-l border-white/8 px-14 py-12 lg:flex xl:px-20">
          <Brand />
          <div className="max-w-xl">
            <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs text-primary">
              <BarChart3 className="size-4" /> پایش هوشمند تراکنش‌ها
            </span>
            <h1 className="text-4xl font-bold leading-[1.55] tracking-tight xl:text-5xl">
              همه‌چیز برای یک تصمیم
              <span className="block text-primary">دقیق‌تر و سریع‌تر</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-400">
              سلامت پرداخت، رفتار پذیرندگان و بینش‌های عملیاتی را در یک نمای یکپارچه ببینید و فرصت‌ها را پیش از آن‌که از دست بروند شناسایی کنید.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <ShieldCheck className="size-4 text-emerald-400" /> ورود امن با دسترسی کنترل‌شده و ثبت رویدادهای مدیریتی
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[27rem]">
            <div className="mb-10 lg:hidden"><Brand /></div>
            <div className="mb-8">
              <div className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <LockKeyhole className="size-6" />
              </div>
              <h2 className="text-2xl font-bold sm:text-3xl">ورود به حساب کاربری</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">برای ورود به پنل سوپرادمین، اطلاعات حساب خود را وارد کنید.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Field label="نام کاربری" icon={<UserRound className="size-5" />}>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus placeholder="نام کاربری خود را وارد کنید" className="h-12 rounded-xl bg-white/[.035] pr-11 text-sm" aria-invalid={Boolean(error)} />
              </Field>
              <Field label="رمز عبور" icon={<LockKeyhole className="size-5" />}>
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="رمز عبور خود را وارد کنید" className="h-12 rounded-xl bg-white/[.035] px-11 text-sm" aria-invalid={Boolean(error)} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-foreground" aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}>
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </Field>
              <div aria-live="polite" className="min-h-6">
                {error && <p className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-red-300">{error}</p>}
              </div>
              <Button type="submit" disabled={isLoading} className="group h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_10px_35px_-12px_rgba(245,158,11,.65)]">
                {isLoading ? <><span className="ml-2 size-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />در حال بررسی...</> : <>ورود به پنل<ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" /></>}
              </Button>
            </form>
            <p className="mt-8 text-center text-xs leading-6 text-slate-600">دسترسی به این سامانه صرفاً برای کاربران مجاز است.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return <div className="flex items-center gap-3"><BrandLogo /><div><p className="font-semibold">دیده‌بان پرداخت</p><p className="text-xs text-muted-foreground">پنل مدیریت زَرین‌پال</p></div></div>;
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><div className="relative"><span className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-500">{icon}</span>{children}</div></label>;
}
