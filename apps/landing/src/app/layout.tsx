import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Instrument_Serif, Caveat } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
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
