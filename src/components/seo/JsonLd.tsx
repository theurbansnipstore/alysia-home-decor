/**
 * Safe JSON-LD renderer (Module 31 Part 18). `dangerouslySetInnerHTML` is
 * used here deliberately and ONLY for this — it is the standard, documented
 * way to emit a `<script type="application/ld+json">` tag in React/Next.js,
 * not a generic escape hatch. The `<` → `<` replacement is the
 * well-known JSON-LD XSS mitigation: without it, a string value containing
 * `</script>` could prematurely close the tag and let following markup be
 * interpreted as script content. `data` must always come from this
 * module's own builder functions (jsonld.ts) — never raw client input.
 */
export default function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  // eslint-disable-next-line react/no-danger
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
