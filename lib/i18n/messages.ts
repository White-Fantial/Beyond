/**
 * Message loader — returns the message dictionary for a given locale.
 *
 * Falls back to 'en' for any missing keys (flat dot-notation access).
 */
import type { SupportedLocale } from "./locale";
import enMessages from "@/messages/en.json";
import koMessages from "@/messages/ko.json";

type MessageDictionary = typeof enMessages;

const DICTIONARIES: Record<SupportedLocale, MessageDictionary> = {
  en: enMessages,
  ko: koMessages as unknown as MessageDictionary,
};

/**
 * Get the full message dictionary for a locale.
 */
export function getMessages(locale: SupportedLocale): MessageDictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.en;
}

/**
 * Type-safe deep access helper. Supports two-level dot notation like "common.save".
 * Returns the English fallback if the key is missing.
 */
export function t(
  locale: SupportedLocale,
  section: keyof MessageDictionary,
  key: string
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.en;
  const sectionObj = dict[section] as Record<string, string> | undefined;
  const value = sectionObj?.[key];
  if (value !== undefined) return value;

  // English fallback
  const fallbackSection = DICTIONARIES.en[section] as Record<string, string> | undefined;
  return fallbackSection?.[key] ?? key;
}
