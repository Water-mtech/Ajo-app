export function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

type Frequency = "weekly" | "monthly";

/**
 * Preview-only schedule: one date per cycle, advancing by the pool's
 * frequency. This is for showing members what to expect during pool
 * creation — actual cycle advancement/payouts are computed server-side
 * once a pool is running.
 */
export function buildCycleSchedule(startDate: string, frequency: Frequency, cycles: number): Date[] {
  const start = new Date(`${startDate}T00:00:00`);
  return Array.from({ length: cycles }, (_, i) => {
    const d = new Date(start);
    if (frequency === "weekly") d.setDate(d.getDate() + i * 7);
    else d.setMonth(d.getMonth() + i);
    return d;
  });
}
