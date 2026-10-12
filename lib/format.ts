export function formatPrice(value: number, lang: string = "bg") {
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, lang: string = "bg") {
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "bg-BG", { maximumFractionDigits: 1 }).format(value);
}

export function formatDate(d: Date | string, lang: string = "bg", withTime = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "bg-BG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Sofia",
  }).format(date);
}

export function formatTime(d: Date) {
  return new Intl.DateTimeFormat("bg-BG", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sofia" }).format(d);
}

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
};

export function slugify(text: string) {
  return text
    .toLowerCase()
    .split("")
    .map((c) => CYR[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/** Converts a value from <input type="datetime-local"> (Sofia local time) to a Date */
export function sofiaLocalToDate(value: string) {
  // Work out Sofia's UTC offset for that moment (handles summer/winter time)
  const guess = new Date(value + "Z");
  const sofia = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Sofia" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = sofia.getTime() - utc.getTime();
  return new Date(guess.getTime() - offsetMs);
}

/** Date -> value for <input type="datetime-local"> in Sofia time */
export function dateToSofiaLocal(d: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Sofia",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(d);
  return parts.replace(" ", "T");
}
