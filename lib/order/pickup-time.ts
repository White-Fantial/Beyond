/**
 * Pickup Time Utilities
 *
 * Calculates the default pickup time for a customer order based on:
 * - Current time
 * - Store prep minutes (or fallback constant)
 * - Optional buffer
 * - Slot rounding (5 or 10 minute increments)
 *
 * TODO: Wire opening hours validation once store operating hours data is available.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default preparation time in minutes when not configured on the store. */
export const DEFAULT_PREP_MINUTES = 15;

/** Default slot interval in minutes. */
export const DEFAULT_SLOT_INTERVAL_MINUTES = 10;

/** How many slots to generate for the pickup time selector. */
export const DEFAULT_SLOT_COUNT = 12;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GetDefaultPickupTimeParams {
  /** Current time. Defaults to now if not provided. */
  now?: Date;
  /** Prep minutes from store config. Defaults to DEFAULT_PREP_MINUTES. */
  prepMinutes?: number;
  /** Additional buffer in minutes. */
  bufferMinutes?: number;
  /** Slot rounding interval in minutes. Defaults to DEFAULT_SLOT_INTERVAL_MINUTES. */
  slotIntervalMinutes?: number;
}

export interface GetAvailablePickupSlotsParams extends GetDefaultPickupTimeParams {
  /** Number of slots to generate. Defaults to DEFAULT_SLOT_COUNT. */
  slotCount?: number;
}

export interface PickupSlot {
  time: Date;
  label: string;
  isAsap: boolean;
}

// ─── Core Utilities ───────────────────────────────────────────────────────────

/**
 * Rounds a date up to the nearest slot boundary.
 *
 * @example
 *   roundToPickupSlot(new Date("2025-01-01T10:23:00"), 10)
 *   // → 2025-01-01T10:30:00
 */
export function roundToPickupSlot(
  date: Date,
  slotIntervalMinutes: number = DEFAULT_SLOT_INTERVAL_MINUTES
): Date {
  const ms = slotIntervalMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/**
 * Returns the earliest possible pickup time for an order.
 *
 * Calculation:
 *   now + prepMinutes + bufferMinutes → rounded up to nearest slot
 */
export function getDefaultPickupTime(
  params: GetDefaultPickupTimeParams = {}
): Date {
  const {
    now = new Date(),
    prepMinutes = DEFAULT_PREP_MINUTES,
    bufferMinutes = 0,
    slotIntervalMinutes = DEFAULT_SLOT_INTERVAL_MINUTES,
  } = params;

  const totalMinutes = prepMinutes + bufferMinutes;
  const earliest = new Date(now.getTime() + totalMinutes * 60 * 1000);
  return roundToPickupSlot(earliest, slotIntervalMinutes);
}

/**
 * Generates a list of available pickup slots starting from the default time.
 *
 * TODO: Filter slots against actual store opening hours once that data is available.
 */
export function getAvailablePickupSlots(
  params: GetAvailablePickupSlotsParams = {}
): PickupSlot[] {
  const {
    slotCount = DEFAULT_SLOT_COUNT,
    slotIntervalMinutes = DEFAULT_SLOT_INTERVAL_MINUTES,
    ...rest
  } = params;

  const defaultTime = getDefaultPickupTime({ ...rest, slotIntervalMinutes });
  const intervalMs = slotIntervalMinutes * 60 * 1000;

  return Array.from({ length: slotCount }, (_, i) => {
    const time = new Date(defaultTime.getTime() + i * intervalMs);
    return {
      time,
      label: formatPickupTime(time),
      isAsap: i === 0,
    };
  });
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Formats a pickup time as a short readable label.
 *
 * @example
 *   formatPickupTime(new Date("2025-01-01T10:30:00"))
 *   // → "10:30 AM"
 */
export function formatPickupTime(time: Date): string {
  return time.toLocaleTimeString("en-NZ", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats a pickup time with a "ASAP" prefix for the default slot.
 */
export function formatPickupLabel(time: Date, isAsap: boolean): string {
  if (isAsap) {
    return `ASAP (${formatPickupTime(time)})`;
  }
  return `Pickup at ${formatPickupTime(time)}`;
}
