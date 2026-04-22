import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CapacitorInit } from "@/components/capacitor-init";
import { NetworkBanner } from "@/components/network-banner";

export const metadata: Metadata = {
  title: { default: "EduHub", template: "%s · EduHub" },
  description: "A modern school management platform for students, fees, attendance, and communication.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",   // lets content go behind the notch
    title: "EduHub",
  },
  formatDetection: {
    telephone: false,   // prevents iOS auto-linking phone numbers
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#060912",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,          // prevent pinch-zoom (feels native)
  userScalable: false,
  viewportFit: "cover",     // content under notch / Dynamic Island
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* iOS splash screens */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <CapacitorInit />
        <NetworkBanner />
        {children}
      </body>
    </html>
  );
}
