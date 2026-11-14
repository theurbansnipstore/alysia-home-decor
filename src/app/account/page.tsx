import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCurrentWishlist } from "@/lib/wishlist/service";
import ProfileForm from "@/components/auth/ProfileForm";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import WishlistGrid from "@/components/wishlist/WishlistGrid";

interface Props {
  searchParams: { tab?: string };
}

export default async function AccountPage({ searchParams }: Props) {
  const session = await requireSession();

  // Account → Wishlist tab: same session, same getCurrentWishlist() the
  // dedicated /wishlist page uses — no separate wishlist logic here, just
  // an alternate entry point that renders inside /account instead of
  // navigating away. The storefront header heart still goes to /wishlist
  // (Header.tsx untouched) — these are two intentionally separate flows.
  if (searchParams.tab === "wishlist") {
    const items = await getCurrentWishlist();
    return (
      <div>
        <h2 className="mb-6 font-display text-lg text-ink">My Wishlist</h2>
        <WishlistGrid items={items} />
      </div>
    );
  }

  // Customer-facing profile intentionally does not select or display
  // `role` — that's an internal concept customers don't need to see.
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  // requireSession() already guarantees a valid, unexpired session — this
  // only covers the edge case where the account was deleted after the
  // token backing that session was issued.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <section className="border border-ink-100 bg-bone-100 p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg text-ink">Personal information</h2>
        <dl className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-500">Email</dt>
            <dd className="text-charcoal">{user.email}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Member since</dt>
            <dd className="text-charcoal">
              {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(user.createdAt)}
            </dd>
          </div>
        </dl>
        <ProfileForm initialName={user.name} initialPhone={user.phone ?? ""} />
      </section>

      <section className="border border-ink-100 bg-bone-100 p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg text-ink">Security</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
