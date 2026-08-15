/**
 * Pulls the icons we use from the Iconify API (lucide set) and writes them into
 * components/ui/icon.tsx as inline SVG — no runtime dependency, no API call in
 * the app, and only the icons we actually reference ship. Same approach as
 * anfani-admin-fe; the driver set is deliberately small because every glyph
 * here carries a short label with it.
 *
 * Usage: node scripts/generate-icons.mjs components/ui/icon.tsx
 */
import { writeFileSync } from "node:fs";

const NAMES = [
  "camera",
  "truck",
  "map-pin",
  "route",
  "flag",
  "clock",
  "clipboard-list",
  "triangle-alert",
  "circle-check",
  "circle-alert",
  "circle-x",
  "shield-alert",
  "message-square-warning",
  "key-round",
  "arrow-left",
  "chevron-right",
  "log-out",
  "refresh-cw",
  "wifi-off",
  "fuel",
  "image",
  "x",
  "check",
  "loader-circle",
  "user-round",
  "phone",
  "building-2",
];

const attrMap = {
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-dasharray": "strokeDasharray",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "stroke-miterlimit": "strokeMiterlimit",
};

function toJsx(markup) {
  let out = markup;
  for (const [from, to] of Object.entries(attrMap)) {
    out = out.replaceAll(`${from}=`, `${to}=`);
  }
  return out.replaceAll("<path", "\n      <path").trim();
}

const entries = [];
for (const name of NAMES) {
  const res = await fetch(`https://api.iconify.design/lucide/${name}.svg`);
  const svg = await res.text();
  if (svg.startsWith("404") || !svg.includes("<svg")) {
    console.error(`MISSING: ${name}`);
    continue;
  }
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  entries.push([name, toJsx(inner)]);
  console.log(`ok ${name}`);
}

const file = `/**
 * Icon set: Lucide, via Iconify (icon-sets.iconify.design), inlined at build-out
 * time so nothing is fetched at runtime. 24×24 grid, 2px stroke, currentColor —
 * size and colour come from the class you pass.
 *
 * Regenerate with \`node scripts/generate-icons.mjs components/ui/icon.tsx\`.
 */
import type { SVGProps } from "react";

const paths = {
${entries
  .map(([name, inner]) => `  "${name}": (\n    <>\n      ${inner}\n    </>\n  ),`)
  .join("\n")}
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "size-6",
  ...rest
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
`;

writeFileSync(process.argv[2], file);
console.log(`wrote ${entries.length} icons`);
