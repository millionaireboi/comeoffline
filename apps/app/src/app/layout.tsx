import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const dmSans = localFont({
  src: "../../../../packages/brand/fonts/DMSans-Variable.woff2",
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = localFont({
  src: [
    { path: "../../../../packages/brand/fonts/DMMono-Light.woff2", weight: "300" },
    { path: "../../../../packages/brand/fonts/DMMono-Regular.woff2", weight: "400" },
    { path: "../../../../packages/brand/fonts/DMMono-Medium.woff2", weight: "500" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

const instrumentSerif = localFont({
  src: [
    { path: "../../../../packages/brand/fonts/InstrumentSerif-Regular.woff2", style: "normal" },
    { path: "../../../../packages/brand/fonts/InstrumentSerif-Italic.woff2", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
});

const caveat = localFont({
  src: "../../../../packages/brand/fonts/Caveat-Variable.woff2",
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "come offline",
  description: "come offline",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "come offline",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E0D0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmMono.variable} ${instrumentSerif.variable} ${caveat.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
