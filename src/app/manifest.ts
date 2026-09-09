import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "jh-soul",
    short_name: "jh-soul",
    description:
      "A calm daily checklist of Shia aamal — duas, ziyarat, tasbih and Quran, with audio.",
    start_url: "/",
    display: "standalone",
    background_color: "#101613",
    theme_color: "#101613",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
