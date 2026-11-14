import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { prisma } from "@/lib/prisma";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import PageForm from "@/components/admin/content/PageForm";

interface Props {
  params: { id: string };
}

export default async function AdminEditPagePage({ params }: Props) {
  await requireRole(CONTENT_AREA_ROLES);

  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) notFound();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Content", href: "/admin/content" }, { label: "Pages", href: "/admin/content/pages" }, { label: page.title }]} />
      <h1 className="mb-6 font-display text-2xl text-ink">Edit Page</h1>
      <PageForm
        mode="edit"
        pageId={page.id}
        initial={{
          title: page.title,
          slug: page.slug,
          content: page.content,
          excerpt: page.excerpt ?? "",
          seoTitle: page.seoTitle ?? "",
          seoDesc: page.seoDesc ?? "",
        }}
        initialStatus={page.status}
      />
    </div>
  );
}
