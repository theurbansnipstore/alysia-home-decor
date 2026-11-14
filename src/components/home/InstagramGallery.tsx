import Image from "next/image";
import type { InstagramPostDTO } from "@/types";

interface InstagramGalleryProps {
  posts: InstagramPostDTO[];
  handle?: string;
  title?: string;
}

export default function InstagramGallery({ posts, handle = "@elysia.home", title = "Styled by our community" }: InstagramGalleryProps) {
  if (!posts.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{handle}</p>
        <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">{title}</h2>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:grid-cols-6">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.link}
            target="_blank"
            rel="noreferrer noopener"
            className="group relative block aspect-square overflow-hidden"
          >
            <Image
              src={post.image}
              alt={post.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 33vw, 16vw"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
