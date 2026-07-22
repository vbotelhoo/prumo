/**
 * Parse and validate month from query param.
 * Format: YYYY-MM where year ∈ [2000, 2100] and month ∈ [01, 12].
 * Invalid or absent → falls back to current month (UTC).
 */
export function parseMonthParam(raw: string | undefined, now?: Date): string {
  if (!raw || typeof raw !== "string") {
    return getCurrentMonth(now);
  }

  const regex = /^(\d{4})-(0[1-9]|1[0-2])$/;
  const match = raw.match(regex);

  if (!match) {
    return getCurrentMonth(now);
  }

  const year = parseInt(match[1], 10);
  if (year < 2000 || year > 2100) {
    return getCurrentMonth(now);
  }

  return raw;
}

/**
 * Get the current month in YYYY-MM format (UTC).
 */
export function getCurrentMonth(now?: Date): string {
  const date = now || new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone: "UTC",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "2000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";

  return `${year}-${month}`;
}

/**
 * Return the previous month as YYYY-MM string.
 * Handles year wrap-around (Jan -> Dec of previous year).
 */
export function previousMonth(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  let year = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);

  m -= 1;
  if (m === 0) {
    m = 12;
    year -= 1;
  }

  return `${year}-${String(m).padStart(2, "0")}`;
}

/**
 * Return the next month as YYYY-MM string.
 * Handles year wrap-around (Dec -> Jan of next year).
 */
export function nextMonth(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  let year = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);

  m += 1;
  if (m === 13) {
    m = 1;
    year += 1;
  }

  return `${year}-${String(m).padStart(2, "0")}`;
}

/**
 * Format month (YYYY-MM) as localized label: "julho de 2026" (pt-BR).
 * Uses Intl for month name; year is always numeric.
 */
export function formatMonthLabel(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);

  // Create a date object for the 1st of the month
  // Using Date constructor with UTC would be safer but we construct manually
  // to avoid timezone surprises: construct with UTC date string
  const dateStr = `${yearStr}-${monthStr}-01T00:00:00Z`;
  const date = new Date(dateStr);

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return formatter.format(date);
}
