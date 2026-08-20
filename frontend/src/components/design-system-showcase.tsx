import { CircleAlert, Info, MoreHorizontal } from "lucide-react";
import { DataState } from "@/components/ui/data-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function DesignSystemShowcase() {
  return (
    <TooltipProvider>
      <main className="min-h-screen bg-background p-4 sm:p-8 lg:p-12">
        <div className="mx-auto max-w-6xl">
          <header className="mb-10 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-primary">سیستم طراحی نسخه ۰.۱</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">کامپوننت‌های پایه داشبورد</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">اجزای این صفحه نمایشی هستند و در صفحات واقعی داشبورد دوباره استفاده می‌شوند.</p>
            </div>
            <Badge variant="secondary">RTL / Vazirmatn / Dark</Badge>
          </header>

          <Tabs defaultValue="controls">
            <TabsList aria-label="بخش‌های سیستم طراحی" className="mb-6 w-full justify-start sm:w-fit">
              <TabsTrigger value="controls">کنترل‌ها</TabsTrigger>
              <TabsTrigger value="states">وضعیت داده</TabsTrigger>
            </TabsList>

            <TabsContent value="controls">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>دکمه‌ها و برچسب‌ها</CardTitle><CardDescription>برای اقدام‌های اصلی، ثانویه و وضعیت‌ها.</CardDescription></CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <Button>اقدام اصلی</Button><Button variant="secondary">اقدام ثانویه</Button><Button variant="outline">نمایش جزئیات</Button>
                    <Badge>نیازمند بررسی</Badge><Badge variant="secondary">پایدار</Badge><Badge variant="destructive">خطا</Badge>
                    <Tooltip><TooltipTrigger asChild><Button aria-label="اطلاعات بیشتر" size="icon" variant="outline"><MoreHorizontal aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>اطلاعات بیشتر</TooltipContent></Tooltip>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>فیلترها و ورودی‌ها</CardTitle><CardDescription>هر ورودی با برچسب صریح و حالت focus قابل مشاهده است.</CardDescription></CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium"><span>جست‌وجوی پذیرنده</span><Input placeholder="نام یا شناسه پذیرنده" /></label>
                    <label className="grid gap-2 text-sm font-medium"><span>بازه زمانی</span><Select><SelectTrigger className="w-full"><SelectValue placeholder="انتخاب بازه" /></SelectTrigger><SelectContent><SelectItem value="week">هفت روز اخیر</SelectItem><SelectItem value="month">سی روز اخیر</SelectItem></SelectContent></Select></label>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>پیام و بارگذاری</CardTitle><CardDescription>بازخورد شفاف بدون ایجاد جابه‌جایی در چیدمان.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <Alert><Info aria-hidden="true" /><AlertTitle>داده نمایشی است</AlertTitle><AlertDescription>تا زمان اتصال Backend، این مقادیر فقط برای طراحی رابط هستند.</AlertDescription></Alert>
                    <div className="space-y-3" aria-label="نمونه حالت بارگذاری"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-4/5" /></div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="states">
              <div className="grid gap-6 lg:grid-cols-3">
                <DataState kind="loading" title="در حال آماده‌سازی داده" description="این بخش تا تکمیل پاسخ سرویس، فضای پایدار خود را حفظ می‌کند." />
                <DataState kind="empty" title="داده‌ای برای نمایش نیست" description="فیلترها یا بازه زمانی انتخاب‌شده را تغییر دهید." actionLabel="پاک‌کردن فیلترها" onAction={() => undefined} />
                <DataState kind="error" title="دریافت داده ناموفق بود" description="ارتباط با منبع داده برقرار نشد. دوباره تلاش کنید." actionLabel="تلاش دوباره" onAction={() => undefined} />
              </div>
              <Alert className="mt-6" variant="destructive"><CircleAlert aria-hidden="true" /><AlertTitle>اصل شفافیت</AlertTitle><AlertDescription>خطا، نبود داده و داده واقعی نباید در رابط یکسان نمایش داده شوند.</AlertDescription></Alert>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </TooltipProvider>
  );
}
