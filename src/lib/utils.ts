import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Toggles a value on a URLSearchParams key. `multi: true` supports
 * multiple values for the same key (e.g. repeated ?badge=), appending or
 * removing just that one value; `multi: false` (default) treats the key
 * as single-select, replacing or clearing it. Always resets `page` to
 * keep pagination consistent with the new filter set. Returns a new
 * URLSearchParams — does not mutate the input.
 */
export function toggleSearchParam(
  current: URLSearchParams,
  key: string,
  value: string,
  multi = false
): URLSearchParams {
  const next = new URLSearchParams(current);

  if (multi) {
    const values = next.getAll(key);
    next.delete(key);
    if (values.includes(value)) {
      values.filter((v) => v !== value).forEach((v) => next.append(key, v));
    } else {
      values.forEach((v) => next.append(key, v));
      next.append(key, value);
    }
  } else {
    if (next.get(key) === value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }

  next.delete("page");
  return next;
}
