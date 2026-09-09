import type { Metadata, Viewport } from "next";
import { Fraunces, Alegreya_Sans, Amiri } from "next/font/google";
import { Pwa } from "@/components/pwa";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

// body/UI text: a warm humanist sans — far easier to read at small sizes
// than a serif, and its calligraphic roots sit well with Fraunces + Amiri
const alegreyaSans = Alegreya_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-alegreya-sans",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  title: "jh-soul — your day of remembrance",
  description:
    "A calm daily checklist of Shia aamal — duas, ziyarat, tasbih and Quran — with audio, one gentle step at a time.",
  appleWebApp: {
    capable: true,
    title: "jh-soul",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#101613",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${alegreyaSans.variable} ${amiri.variable}`}
      // the theme boot script below adds "light" before hydration on purpose
      suppressHydrationWarning
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
        {children}
        <Pwa />
      </body>
    </html>
  );
}
