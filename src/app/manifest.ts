import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Aamal",
    short_name: "Aamal",
    description:
      "A calm daily checklist of Shia aamal — duas, ziyarat, tasbih and Quran, with audio.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1416",
    theme_color: "#0b1416",
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
