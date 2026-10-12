// Helpers for reading FormData in server actions

export function s(fd: FormData, key: string, max = 5000): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function sOrNull(fd: FormData, key: string, max = 5000): string | null {
  return s(fd, key, max) || null;
}

export function int(fd: FormData, key: string): number | null {
  const v = parseInt(s(fd, key).replace(/\s/g, ""), 10);
  return isNaN(v) ? null : v;
}

export function float(fd: FormData, key: string): number | null {
  const v = parseFloat(s(fd, key).replace(",", "."));
  return isNaN(v) ? null : v;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function list(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0);
}

export function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
