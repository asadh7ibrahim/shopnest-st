"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPaymentSlip } from "@/app/actions/orders";
import { compressImage } from "@/lib/image-client";
import { formatBytes } from "@/lib/format";

type Prepared = { file: File; previewUrl: string; originalSize: number };

export function SlipUploader({
  orderId,
  hasSlip,
}: {
  orderId: string;
  hasSlip: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    setError(null);
    setDone(false);
    if (prepared) URL.revokeObjectURL(prepared.previewUrl);
    setPrepared(null);
    if (!original) return;

    setCompressing(true);
    try {
      // Slips must stay legible: allow up to 1800px and ~900 KB
      const file = await compressImage(original, { maxDimension: 1800, maxBytes: 900 * 1024 });
      setPrepared({ file, previewUrl: URL.createObjectURL(file), originalSize: original.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setCompressing(false);
    }
  }

  function onUpload() {
    if (!prepared) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", prepared.file);
    startTransition(async () => {
      const res = await uploadPaymentSlip(orderId, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      URL.revokeObjectURL(prepared.previewUrl);
      setPrepared(null);
      setDone(true);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="slip" className="label">
          {hasSlip ? "Replace payment slip" : "Upload payment slip"}
        </label>
        <input
          ref={inputRef}
          id="slip"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          disabled={compressing || pending}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-1 text-xs text-slate-500">
          JPG, PNG or WebP. Photos are compressed automatically before upload.
        </p>
      </div>

      {compressing && <p className="text-sm text-slate-600">Optimising image…</p>}

      {prepared && (
        <div className="flex items-start gap-4 rounded-xl border border-slate-200 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={prepared.previewUrl} alt="Preview of your payment slip" className="h-28 w-28 rounded-lg object-cover" />
          <div className="text-sm">
            <p className="font-medium">{prepared.file.name}</p>
            <p className="text-slate-500">
              {formatBytes(prepared.originalSize)} → {formatBytes(prepared.file.size)}
            </p>
            <button type="button" onClick={onUpload} disabled={pending} className="btn-primary mt-3">
              {pending ? "Uploading…" : "Submit slip"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">
          Slip uploaded. We&apos;ll review your payment shortly.
        </p>
      )}
    </div>
  );
}
