import Image from "next/image";
import { getImage } from "@/lib/images/registry";
import type { ProductImageDTO } from "@/types";

export default function RoomInspiration({
  roomImage,
  productName,
}: {
  roomImage: ProductImageDTO | null;
  productName: string;
}) {
  const fallback = getImage("heroLivingRoom");
  const image = roomImage
    ? { url: roomImage.url, alt: roomImage.altText || `${productName} styled in a room` }
    : fallback;

  return (
    <section className="mt-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass-600">Room Inspiration</p>
      <h2 className="mb-6 font-display text-2xl text-ink">See it styled</h2>
      <div className="relative aspect-[16/9] overflow-hidden rounded-sm">
        <Image src={image.url} alt={image.alt} fill className="object-cover" sizes="100vw" />
      </div>
    </section>
  );
}
