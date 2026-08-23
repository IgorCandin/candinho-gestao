import type { Metadata } from "next";

const title = "Catálogo Fitness | Candinho Fitness";
const description =
  "Confira peças, tamanhos, disponibilidade e opções da Candinho Fitness.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/catalogo/fitness",
  },
  openGraph: {
    type: "website",
    url: "/catalogo/fitness",
    siteName: "Candinho Fitness",
    title,
    description,
    images: [
      {
        url: "/favicons/cf.png",
        width: 256,
        height: 256,
        alt: "Candinho Fitness",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/favicons/cf.png"],
  },
  icons: {
    icon: "/favicons/cf.png?v=45.44.0",
    shortcut: "/favicons/cf.png?v=45.44.0",
  },
};

export default function FitnessCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
