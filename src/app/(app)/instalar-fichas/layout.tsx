import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instalar Fichas Candinho",
  manifest: "/manifest-fichas.webmanifest",
  appleWebApp: { capable: true, title: "Fichas" },
};

export default function InstallTrainingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
