import type { MetadataRoute } from "next";

// PWA manifest — makes Sardar CRM installable on desktop and mobile. The
// theme color matches the app's dark-mode background so the window chrome
// blends in on standalone launches.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sardar CRM",
    short_name: "Sardar CRM",
    description:
      "Sardar IT's team CRM for Fiverr and Upwork — pipeline, projects, invoices and analytics.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "any",
    background_color: "#1c2233",
    theme_color: "#1c2233",
    lang: "en",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
