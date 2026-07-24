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
 * Add N months to a date (UTC), clamping the day of month to the last day
 * of the target month when the original day doesn't exist there (e.g. Jan
 * 31 + 1 month -> Feb 28/29, not a rollover into March).
 */
export function addMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const targetMonthFirst = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  );
  const lastDayOfTargetMonth = getLastDayOfMonth(targetMonthFirst).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(
    Date.UTC(targetMonthFirst.getUTCFullYear(), targetMonthFirst.getUTCMonth(), clampedDay)
  );
}

/**
 * Get the last day of the month (UTC) for a given date.
 */
export function getLastDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

/**
 * Format Date to ISO date string (YYYY-MM-DD).
 */
export function formatDateIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format an ISO calendar date string (YYYY-MM-DD, no time component) as
 * pt-BR (DD/MM/YYYY) for display — pure string manipulation, no `Date`
 * object involved on purpose. `new Date(isoString).toLocaleDateString()`
 * parses the input as UTC midnight and then renders it in the runtime's
 * local timezone; for any negative UTC offset (e.g. America/Sao_Paulo,
 * UTC-3 — the product's own market, AD-014) that always displays one day
 * earlier than the stored date (roadmap item 9, T16 harden pass — found
 * via UpcomingInstallmentsList, also fixed in TransactionList which had
 * the same bug).
 */
export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    throw new Error(`Data ISO inválida: "${isoDate}"`);
  }
  return `${day}/${month}/${year}`;
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
