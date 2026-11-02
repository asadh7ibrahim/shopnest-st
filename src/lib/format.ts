const currency = process.env.NEXT_PUBLIC_CURRENCY || "USD";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
});

export function formatPrice(value: number | string | null | undefined) {
  return moneyFormatter.format(Number(value ?? 0));
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Always rendered in UTC so server and client output match. */
export function formatDate(value: string | Date) {
  return `${dateFormatter.format(new Date(value))} UTC`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
