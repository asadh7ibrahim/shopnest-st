"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product-image";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: { id: string; path: string; alt: string | null }[];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <ProductImage
          path={current?.path}
          alt={current?.alt || name}
          sizes="(min-width:1024px) 50vw, 100vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={cn(
                  "relative block h-16 w-16 overflow-hidden rounded-lg border-2 bg-slate-100 sm:h-20 sm:w-20",
                  i === index ? "border-indigo-600" : "border-transparent hover:border-slate-300",
                )}
              >
                <ProductImage path={img.path} alt={img.alt || `${name} thumbnail ${i + 1}`} sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
