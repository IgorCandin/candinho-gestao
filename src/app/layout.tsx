import type {
  Metadata,
  Viewport,
} from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AgendaDeliveryFinalizationBridge } from "@/components/agenda-delivery-finalization-bridge";
import { BankOverduePostponeBridge } from "@/components/bank-overdue-postpone-bridge";
import { BankPullToRefresh } from "@/components/bank-pull-to-refresh";
import { ErpPendingFixesBridge } from "@/components/erp-pending-fixes-bridge";
import { FitnessSectorNavigationV4537R13 } from "@/components/fitness-sector-navigation-v45-37-r13";
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
import "./v45-37-r2-operations-ux.css";
import "./v45-37-r8-budget-modal-viewport.css";
import "./v45-37-r9-storefront-mobile.css";
import "./v45-37-r13-fitness-1-0.css";
import "./v45-37-r13-1-confirm-sale-desktop.css";
import "./v45-38-mobile-harmony.css";
import "./operation-navigation-hierarchy.css";
import "./v38-nutrition.css";
import "./v38-nutrition-ai.css";
import "./v45-39-erp-pending-fixes.css";

const FAVICON_VERSION = "45.50.0";

const faviconBootstrap = `
(function () {
  try {
    var p = window.location.pathname || "/";
    var icon = "/favicons/cc.png";

    if (p.indexOf("/bank") === 0) {
      icon = "/favicons/cb.png";
    } else if (
      p.indexOf("/fitness") === 0 ||
      p.indexOf("/catalogo/fitness") === 0
    ) {
      icon = "/favicons/cf.png";
    } else if (
      p.indexOf("/central") === 0 ||
      p.indexOf("/marketing") === 0 ||
      p.indexOf("/nexus") === 0
    ) {
      icon = "/favicons/cce.png";
    } else if (
      p.indexOf("/suplementos") === 0 ||
      p.indexOf("/parceiro") === 0 ||
      p.indexOf("/catalogo/suplementos") === 0 ||
      p.indexOf("/vendas") === 0 ||
      p.indexOf("/clientes") === 0 ||
      p.indexOf("/estoque") === 0 ||
      p.indexOf("/produtos") === 0 ||
      p.indexOf("/agenda") === 0 ||
      p.indexOf("/leads") === 0
    ) {
      icon = "/favicons/cs.png";
    }

    var href =
      icon + "?v=${FAVICON_VERSION}";

    var main =
      document.getElementById(
        "candinho-route-favicon"
      );

    var shortcut =
      document.getElementById(
        "candinho-route-shortcut-favicon"
      );

    if (main) {
      main.setAttribute("href", href);
    }

    if (shortcut) {
      shortcut.setAttribute("href", href);
    }
  } catch (_) {}
})();
`;

export const metadata: Metadata = {
  metadataBase:
    new URL("https://candinho.duckdns.org"),
  title: "Candinho Company",
  description:
    "Gestão integrada da Candinho Company: Central, Suplementos, Fitness, Bank e Portal do Parceiro.",
  applicationName:
    "Candinho Company",
  manifest:
    "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Candinho Company",
    title: "Candinho Company",
    description:
      "Gestão integrada da Candinho Company.",
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
    title: "Candinho Company",
    description:
      "Gestão integrada da Candinho Company.",
    images: ["/favicons/cc.png"],
  },
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
          href={`/favicons/cc.png?v=${FAVICON_VERSION}`}
        />
        <link
          id="candinho-route-shortcut-favicon"
          rel="shortcut icon"
          type="image/png"
          href={`/favicons/cc.png?v=${FAVICON_VERSION}`}
        />
        <link
          rel="apple-touch-icon"
          href="/favicons/cc-v44-180.png"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: faviconBootstrap,
          }}
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
        <FitnessSectorNavigationV4537R13 />
        <AgendaDeliveryFinalizationBridge />

        <Suspense fallback={null}>
          <RouteTabIdentity />
          <ErpPendingFixesBridge />
          <BankOverduePostponeBridge />
        </Suspense>

        <BankPullToRefresh enabled />

        {children}

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
