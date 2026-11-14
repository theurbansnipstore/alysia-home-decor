import Link from "next/link";
import Image from "next/image";

interface CollectionCardProps {
  name: string;
  href: string;
  image?: string | null;
  description?: string | null;
}

export default function CollectionCard({ name, href, image, description }: CollectionCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-bone-200 shadow-sm transition-shadow duration-300 group-hover:shadow-card">
        {image && (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-display text-xl text-bone-100">{name}</h3>
          {description && <p className="mt-1 line-clamp-1 text-xs text-bone-100/80">{description}</p>}
        </div>
      </div>
    </Link>
  );
}
