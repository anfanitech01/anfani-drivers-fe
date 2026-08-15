import type { Metadata, Viewport } from "next";
import { Albert_Sans, Oxanium } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const albert = Albert_Sans({
  variable: "--font-albert",
  subsets: ["latin"],
});

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tracksure Driver",
    template: "%s | Tracksure Driver",
  },
  description: "Anfani Transport driver app — trips, waybills, and fuel stops",
  applicationName: "Tracksure Driver",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tracksure",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // The installed window paints white; the theme colour tints the Android
  // status bar to match the app shell rather than the browser's default.
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${albert.variable} ${oxanium.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
