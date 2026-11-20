import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/lenis-provider";
import { PwaRegister } from "@/components/pwa-register";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B2A5B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Absenta PCC",
  description: "Sistem Presensi Pengurus Organisasi STO dan Panitia PCC Polines",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Absenta PCC",
  },
  icons: {
    icon: [
      { url: "/logo-pcc.png", type: "image/png" },
    ],
    shortcut: ["/logo-pcc.png"],
    apple: ["/logo-pcc.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${poppins.variable} antialiased`}
    >
      <body className={`${poppins.className} min-h-screen flex flex-col font-sans`}>
        <LenisProvider>
          <PwaRegister />
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
