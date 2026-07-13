import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Candinho Company",
  description: "Gestão integrada da Candinho Suplementos, Candinho Fitness e novas operações da Candinho Company.",
  applicationName: "Candinho Company",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#07090d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
