/**
 * Client-side photo handling for the waybill capture engine (TRACKSURE.md §6).
 *
 * Two jobs, both done on the device:
 *   1. Compress. Drivers pay for their own data and the network is weak — a
 *      12 MP camera JPEG becomes a few hundred KB before it leaves the phone.
 *   2. Quality check, best-effort. Blur and darkness are flagged so the driver
 *      can retake, but the check never blocks the upload: a warned photo beats
 *      no photo, and the backend does the authoritative checks.
 */

export interface PreparedPhoto {
  file: File;
  /** Object URL for the on-screen preview. Revoke when done. */
  previewUrl: string;
  originalBytes: number;
  bytes: number;
  width: number;
  height: number;
  quality: PhotoQuality;
}

export interface PhotoQuality {
  passed: boolean;
  /** Plain-words reason shown to the driver when `passed` is false. */
  problem?: string;
  blurScore: number;
  brightness: number;
}

/** Long edge after resize. Enough to read a waybill's handwriting. */
const MAX_EDGE = 1600;
/** Aim below this; a waybill photo on a 3G tether should take seconds. */
const TARGET_BYTES = 600 * 1024;
const QUALITY_STEPS = [0.72, 0.6, 0.5, 0.4];

/** Below this mean luminance (0–255) the photo is too dark to read. */
const DARK_THRESHOLD = 48;
/** Laplacian variance below this reads as out of focus. */
const BLUR_THRESHOLD = 60;

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // `from-image` applies the EXIF rotation, so a portrait phone shot does not
  // arrive at the office sideways.
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function drawTo(
  bitmap: ImageBitmap,
  maxEdge: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This phone's browser cannot process photos.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, width, height };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not compress the photo.")),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Blur + darkness on a 160px grey thumbnail: mean luminance for darkness, and
 * the variance of a 4-neighbour Laplacian for focus. Cheap enough to run on a
 * ₦40k Android without the driver noticing.
 */
function inspect(bitmap: ImageBitmap): PhotoQuality {
  const { canvas, width, height } = drawTo(bitmap, 160);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { passed: true, blurScore: 0, brightness: 0 };
  const { data } = ctx.getImageData(0, 0, width, height);

  const grey = new Float32Array(width * height);
  let sum = 0;
  for (let i = 0; i < grey.length; i++) {
    const p = i * 4;
    const v = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    grey[i] = v;
    sum += v;
  }
  const brightness = sum / grey.length;

  let lapSum = 0;
  let lapSqSum = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        grey[i - 1] + grey[i + 1] + grey[i - width] + grey[i + width] - 4 * grey[i];
      lapSum += lap;
      lapSqSum += lap * lap;
      n++;
    }
  }
  const blurScore = n ? lapSqSum / n - (lapSum / n) ** 2 : 0;

  if (brightness < DARK_THRESHOLD) {
    return {
      passed: false,
      problem: "Too dark to read. Move into the light and take it again.",
      blurScore,
      brightness,
    };
  }
  if (blurScore < BLUR_THRESHOLD) {
    return {
      passed: false,
      problem: "Looks blurry. Hold the phone still and take it again.",
      blurScore,
      brightness,
    };
  }
  return { passed: true, blurScore, brightness };
}

/**
 * Compress and inspect a camera capture. Throws only when the photo cannot be
 * read at all — a failed quality check comes back inside `quality`, not as an
 * error, because the driver decides whether to retake or send anyway.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not a photo. Use the camera button.");
  }

  const bitmap = await loadBitmap(file);
  try {
    const quality = inspect(bitmap);
    const { canvas, width, height } = drawTo(bitmap, MAX_EDGE);

    let blob = await toBlob(canvas, QUALITY_STEPS[0]);
    for (let i = 1; i < QUALITY_STEPS.length && blob.size > TARGET_BYTES; i++) {
      blob = await toBlob(canvas, QUALITY_STEPS[i]);
    }

    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    const out = new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });

    return {
      file: out,
      previewUrl: URL.createObjectURL(out),
      originalBytes: file.size,
      bytes: out.size,
      width,
      height,
      quality,
    };
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
