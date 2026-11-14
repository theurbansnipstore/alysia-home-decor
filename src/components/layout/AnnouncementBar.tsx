import Link from "next/link";
import { getAnnouncementSettings } from "@/lib/settings/announcement";

export default async function AnnouncementBar() {
  const { enabled, text, link } = await getAnnouncementSettings();
  if (!enabled || !text.trim()) return null;

  const className = "block bg-ink py-2 text-center font-mono text-xs uppercase tracking-widest text-bone-100";

  if (link.trim()) {
    return (
      <Link href={link} className={`${className} hover:bg-ink-700`}>
        {text}
      </Link>
    );
  }

  return <div className={className}>{text}</div>;
}
