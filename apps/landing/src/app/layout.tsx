import type { Metadata } from "next";
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
  title: "come offline. — an invite-only community for people who still go outside.",
  description:
    "Curated, phone-free events in Bangalore. House parties, secret dinners, and creative sessions — where phones stay in a lockbox and real connections happen face to face.",
  keywords: [
    "come offline",
    "bangalore events",
    "phone-free events",
    "invite only community",
    "IRL events",
    "social community bangalore",
    "curated events",
    "no phone parties",
  ],
  openGraph: {
    title: "come offline.",
    description: "an invite-only community for people who still believe the best connections happen face to face.",
    url: "https://comeoffline.com",
    siteName: "come offline.",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "come offline.",
    description: "an invite-only community for people who still believe the best connections happen face to face.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
