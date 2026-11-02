"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  deleteProductImage,
  makePrimaryImage,
  uploadProductImage,
} from "@/app/actions/admin-products";
import { compressImage } from "@/lib/image-client";
import { formatBytes } from "@/lib/format";
import { ProductImage } from "@/components/product-image";

type Img = { id: string; path: string; alt: string | null };

export function ImageManager({ productId, images }: { productId: string; images: Img[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setBusy(true);

    let uploaded = 0;
    for (const [i, original] of files.entries()) {
      try {
        setStatus(`Compressing ${i + 1} of ${files.length}…`);
        const file = await compressImage(original, { maxDimension: 1600, maxBytes: 600 * 1024 });
        setStatus(`Uploading ${i + 1} of ${files.length} (${formatBytes(original.size)} → ${formatBytes(file.size)})…`);
        const fd = new FormData();
        fd.set("file", file);
        const res = await uploadProductImage(productId, fd);
        if (!res.ok) {
          setError(`${original.name}: ${res.error}`);
          break;
        }
        uploaded++;
      } catch (err) {
        setError(`${original.name}: ${err instanceof Error ? err.message : "failed"}`);
        break;
      }
    }

    setBusy(false);
    setStatus(uploaded ? `Uploaded ${uploaded} image${uploaded > 1 ? "s" : ""}.` : null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      router.refresh();
    });
  }

  return (
    <section className="card space-y-4 p-5" aria-labelledby="images-heading">
      <div>
        <h2 id="images-heading" className="font-semibold">Images</h2>
        <p className="text-sm text-slate-500">
          Up to 10 images. The first image is the main one. Files are compressed automatically (WebP).
        </p>
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <ProductImage path={img.path} alt={img.alt || `Product image ${i + 1}`} sizes="200px" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                    Main
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {i !== 0 && (
                  <button type="button" disabled={pending} onClick={() => run(() => makePrimaryImage(img.id))} className="btn-secondary btn-sm flex-1">
                    Make main
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm("Delete this image?")) run(() => deleteProductImage(img.id));
                  }}
                  className="btn-secondary btn-sm flex-1 text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label htmlFor="img-upload" className="label">Add images</label>
        <input
          ref={inputRef}
          id="img-upload"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={onFiles}
          disabled={busy || pending}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </div>

      {status && <p className="text-sm text-slate-600" role="status">{status}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  );
}
