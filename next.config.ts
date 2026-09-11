import type { NextConfig } from "next";

/**
 * Rotas antigas da operação Suplementos.
 *
 * O código físico continua temporariamente nas rotas históricas
 * (/vendas, /clientes, /agenda...), mas a URL canônica passa a ser
 * /suplementos/<rota>.
 */
const supplementRouteRoots = [
  "agenda",
  "cadastros",
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

  async headers() {
    const immutable = [
      {
        key: "Cache-Control",
        value:
          "public, max-age=31536000, immutable",
      },
    ];

    return [
      {
        source: "/favicons/:path*",
        headers: immutable,
      },
      {
        source: "/vitrine/:path*",
        headers: immutable,
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/company/dia",
        destination: "/company/gestao",
        permanent: true,
      },
      // Estoque deixa de ser uma tela solta de Suplementos e passa para Gestão.
      {
        source: "/estoque",
        destination: "/company/estoque",
        permanent: false,
      },
      {
        source: "/estoque/:path*",
        destination: "/company/estoque/:path*",
        permanent: false,
      },
      {
        source: "/suplementos/estoque",
        destination: "/company/estoque",
        permanent: false,
      },
      {
        source: "/suplementos/estoque/:path*",
        destination: "/company/estoque/:path*",
        permanent: false,
      },
      // Primeiro bloco da migração: CRM de Suplementos passa a viver na Company.
      {
        source: "/clientes",
        destination: "/company/clientes",
        permanent: false,
      },
      {
        source: "/clientes/:path*",
        destination: "/company/clientes/:path*",
        permanent: false,
      },
      {
        source: "/suplementos/clientes",
        destination: "/company/clientes",
        permanent: false,
      },
      {
        source: "/suplementos/clientes/:path*",
        destination: "/company/clientes/:path*",
        permanent: false,
      },
      {
        source: "/physique",
        destination: "/atletas/inicio",
        permanent: true,
      },
      {
        source: "/physique/:path*",
        destination: "/atletas/:path*",
        permanent: true,
      },
      {
        source: "/bank-lab",
        destination: "/bank",
        permanent: false,
      },
      {
        source: "/bank-lab/:path*",
        destination: "/bank",
        permanent: false,
      },

      // Marketing deixa de ser operação isolada e passa a viver na Central.
      {
        source: "/central/midia",
        has: [
          {
            type: "query" as const,
            key: "scope",
            value: "marketing",
          },
        ],
        destination:
          "/central/marketing/ideias",
        permanent: false,
      },
      {
        source: "/central/agenda",
        has: [
          {
            type: "query" as const,
            key: "scope",
            value: "marketing",
          },
        ],
        destination:
          "/central/marketing/planejamento",
        permanent: false,
      },
      {
        source:
          "/marketing/midia",
        destination:
          "/central/marketing/ideias",
        permanent: false,
      },
      {
        source:
          "/marketing/agenda",
        destination:
          "/central/marketing/planejamento",
        permanent: false,
      },
      {
        source: "/marketing",
        destination:
          "/central/marketing",
        permanent: false,
      },
      {
        source:
          "/marketing/:path*",
        destination:
          "/central/marketing/:path*",
        permanent: false,
      },

      // A Central deixa de ser uma operação isolada e passa a morar em Gestão.
      {
        source: "/central",
        destination: "/company/gestao",
        permanent: false,
      },
      {
        source: "/central/inicio",
        destination: "/company/gestao",
        permanent: false,
      },
      {
        source: "/central/:path*",
        destination: "/company/gestao/central/:path*",
        permanent: false,
      },
      {
        source: "/company/gestao/central",
        destination: "/company/gestao",
        permanent: false,
      },

      ...supplementRouteRoots.flatMap(
        (route) => [
          {
            source:
              `/${route}`,
            destination:
              `/suplementos/${route}`,
            permanent: false,
          },
          {
            source:
              `/${route}/:path*`,
            destination:
              `/suplementos/${route}/:path*`,
            permanent: false,
          },
        ],
      ),
    ];
  },

  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/company/estoque",
          destination: "/estoque",
        },
        {
          source: "/company/estoque/:path*",
          destination: "/estoque/:path*",
        },
        {
          source: "/company/gestao/central/:path*",
          destination: "/central/:path*",
        },
        {
          source: "/atletas",
          destination: "/physique",
        },
        {
          source: "/atletas/:path*",
          destination: "/physique/:path*",
        },
        ...supplementRouteRoots.flatMap(
          (route) => [
            {
              source:
                `/suplementos/${route}`,
              destination:
                `/${route}`,
            },
            {
              source:
                `/suplementos/${route}/:path*`,
              destination:
                `/${route}/:path*`,
            },
          ],
        ),
        {
          source:
            "/central/marketing",
          destination:
            "/marketing",
        },
        {
          source:
            "/central/marketing/:path*",
          destination:
            "/marketing/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
