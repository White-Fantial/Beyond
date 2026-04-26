export interface AvailabilityWindow {
  dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  startTime: string;
  endTime: string;
}

export interface InternalAvailabilityInput {
  isActive?: boolean | null;
  isVisible?: boolean | null;
  availabilityWindows?: AvailabilityWindow[] | null;
}

export interface NormalizedAvailability {
  isAvailable: boolean;
  windows: AvailabilityWindow[];
}

export function normalizeAvailability(input: InternalAvailabilityInput): NormalizedAvailability {
  const isAvailable = (input.isActive ?? true) && (input.isVisible ?? true);
  return {
    isAvailable,
    windows: input.availabilityWindows ?? [],
  };
}
