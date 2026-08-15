import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";

const control =
  "w-full rounded-[0.625rem] border-2 border-line bg-white px-4 text-[1.0625rem] " +
  "text-ink placeholder:text-ink-soft/70 focus:border-brand disabled:opacity-60";

export function TextField({
  label,
  hint,
  error,
  className = "",
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-base font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        // 16px+ keeps iOS from zooming the viewport on focus; it is also the
        // repo's floor for body text.
        className={`${control} mt-2 h-14 ${error ? "border-danger" : ""} ${className}`}
      />
      {error ? (
        <p className="mt-2 text-base font-medium text-danger">{error}</p>
      ) : (
        hint && <p className="mt-2 text-base text-ink-soft">{hint}</p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className = "",
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-base font-medium text-ink-soft">
        {label}
      </label>
      <textarea
        id={id}
        {...rest}
        className={`${control} mt-2 min-h-40 py-3 leading-snug ${error ? "border-danger" : ""} ${className}`}
      />
      {error ? (
        <p className="mt-2 text-base font-medium text-danger">{error}</p>
      ) : (
        hint && <p className="mt-2 text-base text-ink-soft">{hint}</p>
      )}
    </div>
  );
}
