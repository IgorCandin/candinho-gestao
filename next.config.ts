import type { NextConfig } from "next";

/**
 * Rotas antigas da operação Suplementos.
 *
 * O código físico continua temporariamente nas rotas históricas
 * (/vendas, /clientes, /agenda...), mas a URL canônica passa a ser
 * /suplementos/<rota>.
 *
 * Estratégia:
 * - URL antiga -> redirect temporário para a URL canônica.
 * - URL canônica -> rewrite interno para a rota física antiga.
 *
 * Assim não precisamos mover dezenas de pastas de uma vez nem quebrar
 * links, bookmarks, Server Actions ou histórico do ERP.
 */
const supplementRouteRoots = [
  "agenda",
  "cadastros",
  "clientes",
  "estoque",
  "fornecedores",
  "leads",
  "movimentacoes",
  "orcamentos",
  "painel-cs",
  "parceiros",
  "pedidos-fornecedor",
  "pedidos-pendentes",
  "pos-venda",
  "produtos",
  "trocas",
  "vendas",
] as const;

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
  },

  async redirects() {
    return [
      // Compatibilidade de links/bookmarks antigos do Marketing.
      // O Marketing já possui telas nativas próprias; não duplicamos páginas.
      {
        source: "/central/midia",
        has: [{ type: "query" as const, key: "scope", value: "marketing" }],
        destination: "/marketing/ideias",
        permanent: false,
      },
      {
        source: "/central/agenda",
        has: [{ type: "query" as const, key: "scope", value: "marketing" }],
        destination: "/marketing/planejamento",
        permanent: false,
      },
      {
        source: "/marketing/midia",
        destination: "/marketing/ideias",
        permanent: false,
      },
      {
        source: "/marketing/agenda",
        destination: "/marketing/planejamento",
        permanent: false,
      },

      ...supplementRouteRoots.flatMap((route) => [
        {
          source: `/${route}`,
          destination: `/suplementos/${route}`,
          permanent: false,
        },
        {
          source: `/${route}/:path*`,
          destination: `/suplementos/${route}/:path*`,
          permanent: false,
        },
      ]),
    ];
  },

  async rewrites() {
    return {
      beforeFiles: supplementRouteRoots.flatMap((route) => [
        {
          source: `/suplementos/${route}`,
          destination: `/${route}`,
        },
        {
          source: `/suplementos/${route}/:path*`,
          destination: `/${route}/:path*`,
        },
      ]),
    };
  },
};

export default nextConfig;
