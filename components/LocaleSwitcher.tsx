"use client";

import { useRouter, usePathname } from "next/navigation";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/locale";

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "EN",
  ko: "한국어",
};

interface Props {
  currentLocale?: SupportedLocale;
  className?: string;
}

/**
 * Locale switcher — sets a cookie and refreshes the page.
 * Works in any portal nav (Customer, Owner, Backoffice, Admin).
 */
export default function LocaleSwitcher({ currentLocale = "en", className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value as SupportedLocale;
    // Set cookie (7-day expiry)
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    router.refresh();
    // Force a hard reload so server components re-render with new locale
    window.location.href = pathname;
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className="text-xs text-gray-400" aria-hidden="true">🌐</span>
      <select
        value={currentLocale}
        onChange={handleChange}
        aria-label="Select language"
        className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer hover:text-gray-900 focus:ring-0"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
