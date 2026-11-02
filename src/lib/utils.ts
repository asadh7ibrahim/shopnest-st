export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Only allow same-site relative redirects (prevents open-redirect attacks). */
export function safeNext(value: string | null | undefined, fallback = "/") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}

/** Strip characters that have meaning inside PostgREST filters / LIKE patterns. */
export function sanitizeSearch(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/[%_,()*\\"'`;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function toInt(value: string | undefined, fallback: number, min = 1, max = 1_000_000) {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function toNumber(value: string | undefined) {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
