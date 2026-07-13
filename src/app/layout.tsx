import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Candinho Gestão",
  description: "Gestão de estoque, vendas, clientes e rotina operacional da Candinho Suplementos.",
  applicationName: "Candinho Gestão",
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
