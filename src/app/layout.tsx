import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "./ux-homologation.css";
import "./refino-navegacao-vitrine.css";
import "./bank-ux-refino.css";
import "./ux-lapidacao-v2.css";
import "./fitness-ux-v4.css";

export const metadata: Metadata = {
  title: "Candinho Company",
  description:
    "Gestão integrada da Candinho Company: Central, Suplementos, Fitness, Bank e Portal do Parceiro.",
  applicationName: "Candinho Company",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#07090d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
