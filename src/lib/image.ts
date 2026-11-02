import "server-only";
import sharp from "sharp";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

/**
 * Server-side image pipeline (defence in depth — the browser already compressed
 * the file, but we never trust the client):
 *  - verifies the REAL format from the file's bytes (not the file name / MIME header)
 *  - rejects decompression bombs (pixel limit)
 *  - applies EXIF rotation, then strips ALL metadata (GPS, device info…)
 *  - downsizes to `maxDimension` and re-encodes as WebP
 */
export async function processImage(
  file: File,
  opts: { maxDimension: number; quality: number },
): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer());

  const image = sharp(input, { limitInputPixels: 40_000_000, failOn: "error" });
  const meta = await image.metadata();
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new Error("Unsupported image format");
  }

  return image
    .rotate()
    .resize({
      width: opts.maxDimension,
      height: opts.maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: opts.quality, effort: 4 })
    .toBuffer();
}

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // stay under Vercel's 4.5 MB body limit
