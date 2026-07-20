/**
 * Parse ISO date string (YYYY-MM-DD) to Date object (midnight UTC).
 */
export function parseDate(dateString: string): Date {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
}

/**
 * Add N months to a date, preserving the day of month (or clamping to last day if needed).
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get the last day of the month for a given date.
 */
export function getLastDayOfMonth(date: Date): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return lastDay;
}

/**
 * Format Date to ISO date string (YYYY-MM-DD).
 */
export function formatDateIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Check if a date string is valid and within a range.
 * @param dateString - "YYYY-MM-DD"
 * @param minDateString - minimum allowed date (inclusive)
 * @param maxDateString - maximum allowed date (inclusive)
 * @returns true if valid and within range
 */
export function isDateInRange(
  dateString: string,
  minDateString: string,
  maxDateString: string
): boolean {
  const date = parseDate(dateString);
  const minDate = parseDate(minDateString);
  const maxDate = parseDate(maxDateString);

  return date >= minDate && date <= maxDate;
}
