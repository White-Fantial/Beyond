/**
 * Locale utilities — lightweight i18n without external dependencies.
 *
 * Supported locales: 'en' (English) and 'ko' (Korean).
 * Locale is stored in a cookie ('locale') and detected from Accept-Language header.
 */

export type SupportedLocale = "en" | "ko";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "ko"];
export const DEFAULT_LOCALE: SupportedLocale = "en";
export const LOCALE_COOKIE_NAME = "locale";

/**
 * Parse the locale from a cookie string.
 */
export function parseLocaleFromCookie(cookieHeader: string | null | undefined): SupportedLocale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]+)`));
  const value = match?.[1]?.trim();
  if (value && SUPPORTED_LOCALES.includes(value as SupportedLocale)) {
    return value as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Detect locale from Accept-Language header.
 * Returns 'ko' if Korean is preferred, otherwise 'en'.
 */
export function parseLocaleFromAcceptLanguage(
  acceptLanguage: string | null | undefined
): SupportedLocale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  // Simple prefix match for 'ko' (Korean)
  const parts = acceptLanguage.split(",").map((p) => p.split(";")[0].trim().toLowerCase());
  for (const part of parts) {
    if (part.startsWith("ko")) return "ko";
    if (part.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

/**
 * Resolve locale: prefer cookie, fall back to Accept-Language header.
 */
export function resolveLocale(
  cookieHeader: string | null | undefined,
  acceptLanguageHeader: string | null | undefined
): SupportedLocale {
  const fromCookie = parseLocaleFromCookie(cookieHeader);
  if (fromCookie !== DEFAULT_LOCALE || cookieHeader?.includes(LOCALE_COOKIE_NAME)) {
    return fromCookie;
  }
  return parseLocaleFromAcceptLanguage(acceptLanguageHeader);
}
