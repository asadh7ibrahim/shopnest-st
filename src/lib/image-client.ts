/**
 * Browser-side image compression (canvas -> WebP, JPEG fallback).
 * Runs BEFORE upload so a 12 MB phone photo becomes a few hundred KB, which keeps
 * uploads fast, stays far below Vercel's 4.5 MB request limit and keeps Supabase
 * Storage small. The server re-processes the file with sharp anyway.
 */
export type CompressOptions = {
  maxDimension?: number;
  maxBytes?: number;
};

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(
  file: File,
  { maxDimension = 1600, maxBytes = 800 * 1024 }: CompressOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG or WebP).");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be read. Try a JPG, PNG or WebP file.");
  }

  let scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let blob: Blob | null = null;
  let mime = "image/webp";

  // Try progressively lower quality, then progressively smaller dimensions.
  for (let attempt = 0; attempt < 4; attempt++) {
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser cannot process images.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    for (const quality of [0.82, 0.7, 0.58, 0.45]) {
      blob = await canvasToBlob(canvas, mime, quality);
      if (blob && blob.type !== "image/webp" && mime === "image/webp") {
        // Browser has no WebP encoder (older Safari) -> fall back to JPEG.
        mime = "image/jpeg";
        blob = await canvasToBlob(canvas, mime, quality);
      }
      if (blob && blob.size <= maxBytes) break;
    }
    if (blob && blob.size <= maxBytes) break;
    scale *= 0.8;
  }
  bitmap.close();

  if (!blob) throw new Error("Image compression failed.");

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "image";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}
