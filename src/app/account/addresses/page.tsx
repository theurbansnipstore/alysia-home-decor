import { requireSession } from "@/lib/session";
import { getUserAddresses } from "@/lib/data/addresses";
import AddressManager from "@/components/account/AddressManager";
import { addressContent } from "@/lib/content/checkout";

export default async function AddressesPage() {
  const session = await requireSession();
  const addresses = await getUserAddresses(session.id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">{addressContent.pageTitle}</h1>
      <AddressManager addresses={addresses} />
    </div>
  );
}
