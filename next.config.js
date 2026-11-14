/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  // The old "Offers" nav entry pointed here; replaced with a proper
  // Collections/Inspiration page rather than a thin generic deals page.
  // Kept as a redirect in case of any existing external link/bookmark.
  async redirects() {
    return [{ source: "/offers", destination: "/collections", permanent: false }];
  },
  /**
   * Module 40 Part 8 — baseline security headers, applied site-wide.
   * Deliberately limited to headers that cannot break existing behavior:
   *   - X-Content-Type-Options: stops MIME-sniffing; no legitimate page
   *     here relies on a browser guessing a different content type.
   *   - Referrer-Policy: strips the full URL (including any query string)
   *     from the Referer header sent to third-party origins (e.g. the
   *     Razorpay Checkout.js iframe/redirect) while still sending the full
   *     referrer for same-origin navigation — nothing in this app reads
   *     document.referrer, so this is a pure hardening, not a behavior change.
   *   - X-Frame-Options: SAMEORIGIN — clickjacking protection; nothing in
   *     this app is ever legitimately framed by another site.
   *   - Permissions-Policy: explicitly denies camera/microphone/geolocation/
   *     payment device APIs the app never requests, closing them off to any
   *     embedded third-party script (e.g. a compromised ad/analytics tag).
   * Deliberately NOT added: a Content-Security-Policy. This app renders
   * next/image-optimized remote images from 3 allowlisted hosts, Tailwind
   * output, and (once configured) Razorpay's Checkout.js — a correct CSP
   * needs to enumerate all of that precisely and be verified against a real
   * checkout run; getting it wrong silently breaks payment, which is worse
   * than not having one yet. Flagged as a follow-up, not skipped silently.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
