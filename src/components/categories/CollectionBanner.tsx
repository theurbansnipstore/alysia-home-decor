import Image from "next/image";

interface CollectionBannerProps {
  title: string;
  image?: string | null;
  description?: string | null;
}

export default function CollectionBanner({ title, image, description }: CollectionBannerProps) {
  return (
    <section className="relative overflow-hidden bg-ink text-bone-100">
      {image && (
        <div className="absolute inset-0">
          <Image src={image} alt={title} fill priority className="object-cover opacity-60" sizes="100vw" />
        </div>
      )}
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <h1 className="max-w-2xl font-display text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-bone-100/90">{description}</p>}
      </div>
    </section>
  );
}
