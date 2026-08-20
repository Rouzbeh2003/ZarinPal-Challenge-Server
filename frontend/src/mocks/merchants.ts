/**
 * فیکسچرهای فارسی Mock.
 *
 * ⚠️ تمام داده‌های این فایل «نمایشی» هستند و نباید به‌عنوان تحلیل واقعی تراکنش
 * نمایش داده شوند. اعداد صرفاً برای طراحی رابط و توسعه صفحات استفاده می‌شوند.
 * نام پذیرنده‌ها ساختگی است (هم‌نام هیچ پذیرنده واقعی زرین‌پال نیست).
 */

import type { Merchant } from "@/api/types";

export const mockMerchants: Merchant[] = [
  {
    merchantKey: "m_online_shop",
    title: "فروشگاه آنلاین نمونه",
    categoryTitle: "خرده‌فروشی آنلاین",
    status: "active",
  },
  {
    merchantKey: "m_paydel",
    title: "صندوق پی‌دل",
    categoryTitle: "کیف پول و پرداخت",
    status: "active",
  },
  {
    merchantKey: "m_super_online",
    title: "سوپرمارکت آنلاین",
    categoryTitle: "فروشگاه مواد غذایی",
    status: "active",
  },
];

export const mockMerchantOptions = [
  { value: mockMerchants[0].merchantKey, label: mockMerchants[0].title },
  { value: mockMerchants[1].merchantKey, label: mockMerchants[1].title },
  { value: mockMerchants[2].merchantKey, label: mockMerchants[2].title },
];