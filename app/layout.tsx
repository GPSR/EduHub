import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EduHub", template: "%s · EduHub" },
  description: "A modern platform for students, fees, attendance, and school communication."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
