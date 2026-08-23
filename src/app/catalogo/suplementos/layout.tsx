import type { Metadata } from "next";

const title = "Catálogo de Suplementos | Candinho Suplementos";
const description =
  "Confira suplementos, disponibilidade, promoções e opções da Candinho Suplementos.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/catalogo/suplementos",
  },
  openGraph: {
    type: "website",
    url: "/catalogo/suplementos",
    siteName: "Candinho Suplementos",
    title,
    description,
    images: [
      {
        url: "/favicons/cs.png",
        width: 256,
        height: 256,
        alt: "Candinho Suplementos",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/favicons/cs.png"],
  },
  icons: {
    icon: "/favicons/cs.png?v=45.44.0",
    shortcut: "/favicons/cs.png?v=45.44.0",
  },
};

export default function SupplementsCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
