import { redirect } from "next/navigation";
import { getBrandSettings } from "@/lib/config/brand";

export const dynamic = "force-dynamic";

export default function DatabasePreviewPage() {
  if (process.env.DATABASE_URL) redirect("/");
  const brand = getBrandSettings();
  return (
    <main className="min-h-screen bg-[#f5f0e8] px-6 py-16 text-[#302c26] flex items-center justify-center">
      <section className="max-w-xl border border-[#cfc4b4] bg-[#fffdf8] p-10 sm:p-16">
        <p className="text-xs uppercase tracking-[0.25em] text-[#786347]">{brand.name} · Store preview</p>
        <h1 className="mt-8 font-serif text-4xl leading-tight sm:text-5xl">A home for beautiful things.</h1>
        <p className="mt-6 leading-relaxed">Our storefront is being prepared. Please visit again soon to explore our home decor collection.</p>
        <p className="mt-8 border-t border-[#cfc4b4] pt-6 text-sm leading-relaxed text-[#786347]">Placeholder preview — live products, accounts, and checkout are currently unavailable. No purchases can be made here.</p>
      </section>
    </main>
  );
}
