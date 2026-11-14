import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolvePageSeo } from "@/lib/seo/resolve";
import Breadcrumb from "@/components/categories/Breadcrumb";

interface Props {
  params: { slug: string };
}

/**
 * Published-only lookup, reused by both generateMetadata and the page body
 * so a draft (or missing) slug can never leak its title/content into
 * metadata even though the two run as separate requests to this function.
 */
async function getPublishedPage(slug: string) {
  return prisma.page.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPublishedPage(params.slug);
  if (!page) return {};

  const seo = resolvePageSeo(page);
  const urlPath = `/${page.slug}`;

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: urlPath },
    openGraph: { title: seo.title, description: seo.description, url: urlPath, type: "website" },
    twitter: { card: "summary", title: seo.title, description: seo.description },
  };
}

/**
 * Generic editorial page (Module 36) — content is always rendered as plain
 * text via React's normal text interpolation (never dangerouslySetInnerHTML),
 * so there is no HTML/script injection surface regardless of what an admin
 * types into the content field. whitespace-pre-line preserves the author's
 * paragraph breaks without needing any HTML.
 */
export default async function CmsPage({ params }: Props) {
  const page = await getPublishedPage(params.slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <h1 className="mb-6 font-display text-3xl text-ink sm:text-4xl">{page.title}</h1>
      <div className="whitespace-pre-line text-sm leading-relaxed text-ink-500">{page.content}</div>
    </div>
  );
}
