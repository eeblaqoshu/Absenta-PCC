// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Absenta PCC - Presensi Pengurus",
    short_name: "Absenta PCC",
    description: "Sistem Presensi Pengurus Organisasi STO dan Panitia PCC Polines",
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0B2A5B",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo-pcc.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-pcc.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-pcc.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
