import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Absenta PCC",
  description: "Sistem Presensi Pengurus Organisasi STO dan Panitia PCC Polines",
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
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className={`${poppins.className} min-h-full flex flex-col font-sans`}>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
