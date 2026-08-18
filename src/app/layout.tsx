import type { Metadata, Viewport } from "next";
import { Fraunces, Newsreader, Amiri } from "next/font/google";
import { Pwa } from "@/components/pwa";
import { ThemeToggle } from "@/components/theme-toggle";
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
  appleWebApp: {
    capable: true,
    title: "Daily Aamal",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e131f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${newsreader.variable} ${amiri.variable}`}
    >
      <head>
        {/* apply saved theme before first paint to avoid a flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("da:theme")==="light")document.documentElement.classList.add("light")}catch(e){}`,
          }}
        />
        {/* warm up connections used on every visit */}
        <link rel="preconnect" href="https://api.aladhan.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </head>
      <body className="antialiased">
        <ThemeToggle />
        {children}
        <Pwa />
      </body>
    </html>
  );
}
