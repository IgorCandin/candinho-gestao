import type { Metadata } from "next";

const title = "Vitrine Candinho | Candinho Company";
const description =
  "Catálogo público da Candinho Company com suplementos, Fitness, disponibilidade, promoções e produtos do ERP.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/catalogo",
  },
  openGraph: {
    type: "website",
    url: "/catalogo",
    siteName: "Candinho Company",
    title,
    description,
    images: [
      {
        url: "/favicons/cc.png",
        width: 256,
        height: 256,
        alt: "Candinho Company",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/favicons/cc.png"],
  },
  icons: {
    icon: "/favicons/cc.png?v=45.44.0",
    shortcut: "/favicons/cc.png?v=45.44.0",
    apple: "/favicons/cc-v44-180.png?v=45.44.0",
  },
};

export default function PublicCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="catalog-public-scope">{children}</div>;
}
