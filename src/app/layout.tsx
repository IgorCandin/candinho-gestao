import type {
  Metadata,
  Viewport,
} from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BankPullToRefresh } from "@/components/bank-pull-to-refresh";
import { NavigationStabilityV4537R1 } from "@/components/navigation-stability-v45-37-r1";
import { RouteTabIdentity } from "@/components/route-tab-identity";
import "./globals.css";
import "./ux-homologation.css";
import "./refino-navegacao-vitrine.css";
import "./bank-ux-refino.css";
import "./ux-lapidacao-v2.css";
import "./fitness-ux-v4.css";
import "./nexus-company-gray.css";
import "./fitness-availability-v1.css";
import "./public-storefront-company-v7.css";
import "./v45-30-commercial-queue.css";
import "./v45-32-catalog-agenda-tools.css";
import "./v45-33-operational-finish.css";
import "./v45-35-media-favicon.css";
import "./v45-36-performance.css";
import "./v45-37-media-fitness.css";

export const metadata: Metadata = {
  title: "Candinho Company",
  description:
    "Gestão integrada da Candinho Company: Central, Suplementos, Fitness, Bank e Portal do Parceiro.",
  applicationName:
    "Candinho Company",
  manifest:
    "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#07090d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseOrigin =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.replace(
        /\/+$/,
        "",
      );

  return (
    <html lang="pt-BR">
      <head>
        <link
          id="candinho-route-favicon"
          rel="icon"
          type="image/png"
          href="/favicons/cc.png?v=45.37.1"
        />
        <link
          rel="apple-touch-icon"
          href="/favicons/cc-v44-180.png"
        />

        {supabaseOrigin && (
          <>
            <link
              rel="preconnect"
              href={supabaseOrigin}
              crossOrigin="anonymous"
            />
            <link
              rel="dns-prefetch"
              href={supabaseOrigin}
            />
          </>
        )}
      </head>

      <body>
        <NavigationStabilityV4537R1 />

        <Suspense fallback={null}>
          <RouteTabIdentity />
        </Suspense>

        <BankPullToRefresh enabled />

        {children}

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
