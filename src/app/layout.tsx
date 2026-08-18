import type { Metadata, Viewport } from "next";
import { Fraunces, Newsreader, Amiri } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  title: "Daily Aamal — your day of remembrance",
  description:
    "A calm daily checklist of Shia aamal — duas, ziyarat, tasbih and Quran — with audio, one gentle step at a time.",
};

export const viewport: Viewport = {
  themeColor: "#0b1416",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${newsreader.variable} ${amiri.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
