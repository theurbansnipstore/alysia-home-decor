/**
 * Module 40 Part 4 — local performance/regression sanity suite. Measures
 * REAL request duration, REAL response payload size, and (when the dev
 * server is run with PRISMA_LOG_QUERIES=1) REAL Prisma query counts per
 * page, by reading the dev server's own stdout log and slicing it by byte
 * offset around each request. This is not a load test and reports no
 * invented numbers — every figure here comes from an actual local request
 * against the real running app and real local database.
 *
 * Query-count measurement requires the dev server to have been started
 * with PRISMA_LOG_QUERIES=1 (see src/lib/prisma.ts — opt-in, off by
 * default, zero behavior change otherwise) AND its stdout redirected to a
 * log file whose path is passed via DEV_SERVER_LOG. Without that env var,
 * this script still runs and still reports real duration/payload-size
 * numbers — it just labels query counts "not measured this run" instead
 * of fabricating a number.
 *
 * Usage:
 *   npm run simulate:performance
 *   DEV_SERVER_LOG=/tmp/dev-server-perf.log npm run simulate:performance
 */
import { statSync, existsSync, openSync, readSync, closeSync } from "fs";

const PORT = process.env.DEV_PORT || "3000";
const BASE = `http://localhost:${PORT}`;
const LOG_PATH = process.env.DEV_SERVER_LOG || "";
const QUERY_COUNTING_AVAILABLE = LOG_PATH !== "" && existsSync(LOG_PATH);

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? "");
}

interface Measurement {
  label: string;
  path: string;
  status: number;
  durationMs: number;
  bytes: number;
  queryCount: number | null;
  queryBreakdown: Record<string, number> | null;
}

function countQueriesSince(offsetBefore: number): { count: number; breakdown: Record<string, number> } {
  if (!QUERY_COUNTING_AVAILABLE) return { count: 0, breakdown: {} };
  const offsetAfter = statSync(LOG_PATH).size;
  if (offsetAfter <= offsetBefore) return { count: 0, breakdown: {} };
  const fd = openSync(LOG_PATH, "r");
  const length = offsetAfter - offsetBefore;
  const buffer = Buffer.alloc(length);
  readSync(fd, buffer, 0, length, offsetBefore);
  closeSync(fd);
  const slice = buffer.toString("utf8");
  const lines = slice.split("\n").filter((l) => l.includes("prisma:query") && !l.includes("SELECT 1"));
  const breakdown: Record<string, number> = {};
  for (const line of lines) {
    const match = line.match(/FROM `[^`]+`\.`([A-Za-z]+)`/);
    const table = match ? match[1] : "other";
    breakdown[table] = (breakdown[table] ?? 0) + 1;
  }
  return { count: lines.length, breakdown };
}

async function measure(label: string, path: string): Promise<Measurement> {
  const offsetBefore = QUERY_COUNTING_AVAILABLE ? statSync(LOG_PATH).size : 0;
  const start = performance.now();
  const res = await fetch(`${BASE}${path}`);
  const body = await res.text();
  const durationMs = performance.now() - start;
  // Let async log writes flush before slicing the log file.
  if (QUERY_COUNTING_AVAILABLE) await new Promise((r) => setTimeout(r, 150));
  const { count, breakdown } = countQueriesSince(offsetBefore);
  return {
    label, path, status: res.status, durationMs: Math.round(durationMs),
    bytes: Buffer.byteLength(body),
    queryCount: QUERY_COUNTING_AVAILABLE ? count : null,
    queryBreakdown: QUERY_COUNTING_AVAILABLE ? breakdown : null,
  };
}

const PAGES: { label: string; path: string }[] = [
  { label: "Homepage", path: "/" },
  { label: "Shop", path: "/shop" },
  { label: "Category", path: "/categories" },
  { label: "Category detail", path: "" }, // resolved live below
  { label: "Theme", path: "/themes" },
  { label: "Theme detail", path: "" },
  { label: "Collections", path: "/collections" },
  { label: "Product detail", path: "" },
  { label: "Cart", path: "/cart" },
  { label: "Sitemap", path: "/sitemap.xml" },
];

async function resolveLiveSlugs(): Promise<{ category?: string; theme?: string; product?: string }> {
  const [catRes, themeRes, prodRes] = await Promise.all([
    fetch(`${BASE}/api/categories`).then((r) => r.json()).catch(() => null),
    fetch(`${BASE}/api/themes`).then((r) => r.json()).catch(() => null),
    fetch(`${BASE}/api/products?pageSize=1`).then((r) => r.json()).catch(() => null),
  ]);
  return {
    category: catRes?.data?.categories?.[0]?.slug,
    theme: themeRes?.data?.themes?.[0]?.slug,
    product: prodRes?.data?.products?.[0]?.slug,
  };
}

async function main() {
  log("Config", { BASE, queryCountingAvailable: QUERY_COUNTING_AVAILABLE, logPath: LOG_PATH || "(not set)" });
  if (!QUERY_COUNTING_AVAILABLE) {
    log("Note", "DEV_SERVER_LOG not set or file not found — query counts will be reported as 'not measured this run', not fabricated. Duration and payload size are always real.");
  }

  const slugs = await resolveLiveSlugs();
  const targets = PAGES.map((p) => {
    if (p.label === "Category detail") return { ...p, path: slugs.category ? `/categories/${slugs.category}` : "" };
    if (p.label === "Theme detail") return { ...p, path: slugs.theme ? `/themes/${slugs.theme}` : "" };
    if (p.label === "Product detail") return { ...p, path: slugs.product ? `/product/${slugs.product}` : "" };
    return p;
  }).filter((p) => p.path);

  console.log("\n" + "=".repeat(90));
  console.log("WARM-UP PASS (excluded from reported numbers — absorbs one-time Next.js compile cost)");
  console.log("=".repeat(90));
  for (const t of targets) {
    await measure(t.label, t.path);
  }

  console.log("\n" + "=".repeat(90));
  console.log("MEASURED PASS");
  console.log("=".repeat(90));
  const results: Measurement[] = [];
  for (const t of targets) {
    const m = await measure(t.label, t.path);
    results.push(m);
    console.log(
      `${m.label.padEnd(18)} ${m.path.padEnd(28)} status=${m.status} duration=${m.durationMs}ms bytes=${m.bytes}` +
        (m.queryCount !== null ? ` queries=${m.queryCount} ${JSON.stringify(m.queryBreakdown)}` : " queries=not measured")
    );
  }

  console.log("\n" + "=".repeat(90));
  console.log("DUPLICATE-REQUEST CHECK — same page requested twice in a row");
  console.log("=".repeat(90));
  for (const t of targets.slice(0, 4)) {
    const first = await measure(t.label, t.path);
    const second = await measure(t.label, t.path);
    console.log(
      `${t.label.padEnd(18)} run1=${first.durationMs}ms/${first.queryCount ?? "?"}q  run2=${second.durationMs}ms/${second.queryCount ?? "?"}q` +
        (first.queryCount !== null && second.queryCount !== null && second.queryCount > first.queryCount
          ? "  ⚠ second run issued MORE queries than the first — investigate"
          : "")
    );
  }

  // Admin pages need auth — measured separately, best-effort, never failing the run if login isn't available.
  console.log("\n" + "=".repeat(90));
  console.log("ADMIN PAGES (best-effort — requires ADMIN_EMAIL/ADMIN_PASSWORD to succeed)");
  console.log("=".repeat(90));
  try {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: process.env.ADMIN_EMAIL || "admin@kutir.in", password: process.env.ADMIN_PASSWORD || "Admin@12345" }),
    });
    const cookie = loginRes.headers.get("set-cookie")?.split(";")[0];
    if (loginRes.ok && cookie) {
      for (const [label, path] of [["Admin product list", "/admin/products"], ["Admin order list", "/admin/orders"]] as const) {
        const offsetBefore = QUERY_COUNTING_AVAILABLE ? statSync(LOG_PATH).size : 0;
        const start = performance.now();
        const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
        const body = await res.text();
        const durationMs = Math.round(performance.now() - start);
        if (QUERY_COUNTING_AVAILABLE) await new Promise((r) => setTimeout(r, 150));
        const { count } = countQueriesSince(offsetBefore);
        console.log(`${label.padEnd(18)} ${path.padEnd(28)} status=${res.status} duration=${durationMs}ms bytes=${Buffer.byteLength(body)}` + (QUERY_COUNTING_AVAILABLE ? ` queries=${count}` : " queries=not measured"));
      }
    } else {
      log("Admin pages skipped", "login did not succeed");
    }
  } catch (err) {
    log("Admin pages skipped", String(err));
  }

  console.log("\n✅ Performance sanity pass complete — see numbers above for the report.");
}

main().catch((err) => {
  console.error("\n❌ Performance simulation failed:", err);
  process.exitCode = 1;
});
