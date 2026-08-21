import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, EyeOff, Search } from "lucide-react";
import { getMerchantCredentials, type MerchantCredential } from "@/api/adapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export function MerchantsPage() {
  const { authState } = useAuth();
  const [items, setItems] = useState<MerchantCredential[]>([]);
  const [query, setQuery] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    if (authState.status !== "ready" || !authState.isSuperuser) return;
    void getMerchantCredentials()
      .then(setItems)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "خطای نامشخص"));
  }, [authState]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [item.merchant_key, item.category_title, item.username].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [items, query]);

  if (authState.status !== "ready" || !authState.isSuperuser) {
    return <div className="rounded-xl border border-destructive/40 bg-card p-6 text-sm">دسترسی به این بخش فقط برای سوپرادمین مجاز است.</div>;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length.toLocaleString("fa-IR")} پذیرنده</p>
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی شناسه، صنف یا نام کاربری" className="pr-9" />
        </div>
      </div>
      {error ? <p className="p-6 text-sm text-destructive">{error}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-center text-sm">
            <thead className="bg-muted/50 text-muted-foreground"><tr><th className="p-3 text-center">شناسه پذیرنده</th><th className="p-3 text-center">صنف</th><th className="p-3 text-center">نام کاربری</th><th className="p-3 text-center">رمز عبور</th></tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => {
                const isVisible = visiblePasswords.has(item.merchant_key);
                return <tr key={item.merchant_key} className="hover:bg-muted/30">
                  <td className="p-3 text-center font-medium" dir="ltr">{item.merchant_key}</td>
                  <td className="p-3 text-center text-muted-foreground">{item.category_title || "—"}</td>
                  <td className="p-3 text-center"><CredentialValue value={item.username} /></td>
                  <td className="p-3 text-center"><div className="flex items-center justify-center gap-1" dir="ltr"><code className="min-w-36 rounded bg-muted px-2 py-1">{item.password ? (isVisible ? item.password : "••••••••••••") : "ثبت نشده"}</code>{item.password && <Button variant="ghost" size="icon" aria-label={isVisible ? "مخفی کردن رمز" : "نمایش رمز"} onClick={() => setVisiblePasswords((current) => { const next = new Set(current); isVisible ? next.delete(item.merchant_key) : next.add(item.merchant_key); return next; })}>{isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>}{item.password && <CopyButton value={item.password} />}</div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CredentialValue({ value }: { value: string }) {
  return <div className="flex items-center justify-center gap-1" dir="ltr"><code className="rounded bg-muted px-2 py-1">{value || "ثبت نشده"}</code>{value && <CopyButton value={value} />}</div>;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <Button variant="ghost" size="icon" aria-label="کپی" title={copied ? "کپی شد" : "کپی"} onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }}><Copy className="size-4" /></Button>;
}
