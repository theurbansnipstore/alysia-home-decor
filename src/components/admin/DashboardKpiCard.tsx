import Link from "next/link";

export default function DashboardKpiCard({
  label,
  value,
  href,
  warn,
}: {
  label: string;
  value: string | number;
  href: string;
  warn?: boolean;
}) {
  return (
    <Link href={href} className="block border border-ink-100 bg-bone p-4 transition-colors hover:border-brass">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl ${warn ? "text-clay" : "text-ink"}`}>{value}</p>
    </Link>
  );
}
