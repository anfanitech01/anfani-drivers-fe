"use client";

import { useId, useRef, useState } from "react";

/**
 * The PIN is the driver's signature (journey plan declarations) and their key
 * (login). 4 digits, per the API.
 *
 * One real input sits transparent on top of the boxes: the phone's own numeric
 * keyboard does the typing, which is the only reliable thing across the cheap
 * Androids this app runs on. The boxes are decoration and never take a tap.
 */
export function PinInput({
  value,
  onChange,
  onComplete,
  label = "Your PIN",
  autoFocus = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  const boxes = Array.from({ length: 4 });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-base font-medium text-ink-soft">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="tap -mr-2 px-3 text-base font-semibold text-brand-deep"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      <div className="relative mt-2">
        <div className="pointer-events-none flex gap-2" aria-hidden>
          {boxes.map((_, i) => {
            const filled = i < value.length;
            const isNext = i === value.length && focused;
            return (
              <div
                key={i}
                className={`flex h-16 flex-1 items-center justify-center rounded-[0.625rem] border-2 bg-white text-2xl font-semibold text-ink ${
                  isNext
                    ? "border-brand"
                    : filled
                      ? "border-ink-soft"
                      : "border-line"
                }`}
              >
                {filled ? (show ? value[i] : "•") : ""}
              </div>
            );
          })}
        </div>

        <input
          ref={inputRef}
          id={id}
          type={show ? "text" : "password"}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={4}
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 4);
            onChange(next);
            if (next.length === 4) onComplete?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.length >= 4) onComplete?.();
          }}
          className="absolute inset-0 h-full w-full cursor-pointer bg-transparent text-transparent caret-transparent"
          aria-label={label}
        />
      </div>

      <p className="mt-2 text-base text-ink-soft">4 numbers.</p>
    </div>
  );
}
