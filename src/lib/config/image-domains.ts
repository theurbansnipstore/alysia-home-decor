/**
 * Module 38 Part 8 — mirrors next.config.js's images.remotePatterns exactly,
 * for client-side "will this actually render" validation in admin image
 * fields. Can't import next.config.js directly here: it's a plain
 * CommonJS file evaluated by Next's build tooling before any TS/ESM
 * transform runs, so this project has no automatic way to share the list
 * between the two — if you add a hostname to next.config.js, add it here
 * too, and vice versa. Never widen this to "*" or a runtime regex that
 * effectively allows any host — that would silently defeat the whitelist
 * next.config.js enforces.
 */
export const ALLOWED_IMAGE_HOSTS = ["picsum.photos", "images.pexels.com", "res.cloudinary.com"];

/**
 * A relative path (e.g. "/logo.svg") is always fine — served straight from
 * public/, not subject to remotePatterns at all. An absolute URL is only
 * safe to use in next/image if its hostname is in the whitelist above;
 * this is advisory only (it can't be the enforcement point — that's
 * next.config.js at render time) so admins get a clear warning before
 * saving something that would otherwise silently fail to render.
 */
export function checkImageUrl(value: string): { ok: true } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true };
  if (trimmed.startsWith("/")) return { ok: true };

  let host: string;
  try {
    host = new URL(trimmed).hostname;
  } catch {
    return { ok: false, message: "Not a valid URL or a relative path starting with \"/\"." };
  }

  if (ALLOWED_IMAGE_HOSTS.includes(host)) return { ok: true };
  return {
    ok: false,
    message: `"${host}" isn't an allowed image domain (allowed: ${ALLOWED_IMAGE_HOSTS.join(", ")}). This image won't render until an admin adds it to next.config.js.`,
  };
}
