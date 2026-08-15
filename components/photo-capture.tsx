"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Alert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { formatBytes, preparePhoto, type PreparedPhoto } from "@/lib/photo";

/**
 * Camera-first capture. The button opens the rear camera directly
 * (`capture="environment"`); the gallery is still reachable from the phone's
 * own picker if the driver has already taken the shot.
 *
 * Compression and the blur/darkness check happen here, before the parent screen
 * ever sees a file, so every upload path gets both for free.
 */
export function PhotoCapture({
  photo,
  onChange,
  label,
  hint,
  disabled = false,
  required = true,
}: {
  photo: PreparedPhoto | null;
  onChange: (photo: PreparedPhoto | null) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The preview is an object URL; let it go when the photo changes or the
  // screen unmounts, or a long shift leaks a few MB per capture.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setWorking(true);
    setError(null);
    try {
      const prepared = await preparePhoto(file);
      onChange(prepared);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read that photo.",
      );
    } finally {
      setWorking(false);
      // Reset so retaking the same file fires `change` again.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || working}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {photo ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[0.625rem] border-2 border-line bg-surface">
            {/* Unoptimized: this is a local object URL, there is nothing for
                the image optimiser to fetch or cache. */}
            <Image
              src={photo.previewUrl}
              alt="The photo you just took"
              width={photo.width}
              height={photo.height}
              unoptimized
              className="h-auto w-full"
            />
          </div>

          <p className="text-base text-ink-soft">
            {formatBytes(photo.originalBytes)} shrunk to{" "}
            <span className="font-semibold text-ink">
              {formatBytes(photo.bytes)}
            </span>{" "}
            to save your data.
          </p>

          {!photo.quality.passed && photo.quality.problem && (
            <Alert tone="warning" title="Check this photo">
              {photo.quality.problem} You can still send it.
            </Alert>
          )}

          <button
            type="button"
            disabled={disabled || working}
            onClick={() => inputRef.current?.click()}
            className="tap flex w-full items-center justify-center gap-3 rounded-[0.625rem] border-2 border-line bg-white px-5 text-base font-semibold text-ink active:bg-surface disabled:opacity-50"
          >
            <Icon name="camera" className="size-6" />
            Take it again
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || working}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-[0.625rem] border-2 border-dashed border-brand bg-brand-tint px-5 py-8 text-center active:bg-brand-tint/70 disabled:opacity-60"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-[image:var(--grad-brand)] text-white shadow-[var(--glow-brand)]">
            <Icon
              name={working ? "loader-circle" : "camera"}
              className={`size-8 ${working ? "animate-spin" : ""}`}
            />
          </span>
          <span className="font-display text-xl font-semibold text-ink">
            {working ? "Getting the photo ready…" : label}
          </span>
          {hint && (
            <span className="text-base leading-snug text-ink-soft">{hint}</span>
          )}
          {!required && (
            <span className="text-base text-ink-soft">Optional</span>
          )}
        </button>
      )}

      {error && (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </div>
  );
}
