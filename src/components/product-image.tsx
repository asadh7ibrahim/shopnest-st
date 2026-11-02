import Image from "next/image";
import { publicImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** Parent element must be `relative` and have a size (e.g. aspect-square). */
export function ProductImage({
  path,
  alt,
  sizes,
  priority = false,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!path) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300"
        role="img"
        aria-label={`${alt} (no image)`}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }
  return (
    <Image
      src={publicImageUrl(path)}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
