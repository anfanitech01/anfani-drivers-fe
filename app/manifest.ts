import type { MetadataRoute } from "next";

/**
 * Home-screen install is an acceptance criterion (TRACKSURE.md §12). Chrome
 * needs name, start_url, display and both a 192 and a 512 icon before it will
 * offer the prompt; iOS uses `app/apple-icon.png` instead.
 *
 * All icons come from `scripts/generate-pwa-icons.mjs`. The `maskable` pair is
 * what Android actually puts on the home screen — `any` is for the task
 * switcher and splash — and `monochrome` is what Android 13+ tints for themed
 * icons. Missing that last one makes the launcher shrink the colour icon inside
 * a grey circle.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tracksure Driver",
    short_name: "Tracksure",
    description:
      "Anfani Transport driver app — current trip, journey plan, waybills and complaints",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-monochrome-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
  };
}
