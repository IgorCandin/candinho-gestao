import { getBankDashboardData } from "@/lib/bank-data";
import {
  getInventoryOverview,
  getPartnersOverview,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const number = (value: unknown) =>
  Number(value ?? 0);

const text = (value: unknown) =>
  typeof value === "string"
    ? value
    : null;

function brazilDateParts(
  date = new Date(),
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    )
      .format(date)
      .split("-");

  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
  };
}

function isoDate(
  year: number,
  month: number,
  day: number,
) {
  return `${year}-${String(
    month,
  ).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
}

function addDays(
  value: string,
  days: number,
) {
  const date = new Date(
    `${value}T12:00:00-03:00`,
  );

  date.setUTCDate(
    date.getUTCDate() + days,
  );

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

function monthBounds() {
  const {
    year,
    month,
  } = brazilDateParts();

  const next =
    month === 12
      ? {
          year: year + 1,
          month: 1,
        }
      : {
          year,
          month:
            month + 1,
        };

  return {
    today: isoDate(
      year,
      month,
      brazilDateParts().day,
    ),
    start: `${isoDate(
      year,
      month,
      1,
    )}T00:00:00-03:00`,
    end: `${isoDate(
      next.year,
      next.month,
      1,
    )}T00:00:00-03:00`,
    startDate: isoDate(
      year,
      month,
      1,
    ),
    endDate: isoDate(
      next.year,
      next.month,
      1,
    ),
  };
}

type SaleTotals = {
  count: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type ExecutiveAlert = {
  tone:
    | "critical"
    | "attention"
    | "info";
  title: string;
  description: string;
  href: string;
  count: number;
  amount?: number;
};

export type ExecutiveForecast = {
  label: string;
  income: number;
  expenses: number;
  result: number;
  note: string;
};

export type ExecutiveSnapshot = {
  generatedAt: string;
  referenceMonth: string;
  sales: {
    supplements: SaleTotals;
    fitness: SaleTotals;
    company: SaleTotals;
    receivedThisMonth: number;
    marginPct: number;
  };
  finance: {
    cash: number;
    receivables: number;
    debt: number;
    inventoryCost: number;
    netPosition: number;
    monthlyInvested: number;
    capitalAllocated: number;
  };
  forecast: {
    next7Days: ExecutiveForecast;
    next30Days: ExecutiveForecast;
    next60Days: ExecutiveForecast;
    next90Days: ExecutiveForecast;
  };
  operations: {
    postSaleOpen: number;
    postSaleOverdue: number;
    openReturns: number;
    overdueConsignments: number;
    activePartners: number;
    partnerSettlementsPending: number;
    partnerStockUnits: number;
    marketingActive: number;
    marketingReady: number;
    marketingPublished: number;
    marketingErrors: number;
    lowStock: number;
    zeroStock: number;
    flavorIntegrityIssues: number;
  };
  alerts: ExecutiveAlert[];
  bankReviewAlerts: Array<{
    title: string;
    description: string;
    href: string;
    count: number;
    amount?: number;
  }>;
};

function aggregateSales(
  rows: Array<
    Record<
      string,
      unknown
    >
  >,
): SaleTotals {
  return rows.reduce<SaleTotals>(
    (
      result,
      row,
    ) => ({
      count:
        result.count + 1,
      revenue:
        result.revenue +
        number(
          row.total_amount,
        ),
      cost:
        result.cost +
        number(
          row.total_cost,
        ),
      profit:
        result.profit +
        number(
          row.total_profit,
        ),
    }),
    {
      count: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    },
  );
}

function sumForecast(
  rows: Array<{
    totalExpectedIncome: number;
    totalCommitments: number;
    projectedResult: number;
  }>,
) {
  return rows.reduce(
    (
      result,
      row,
    ) => ({
      income:
        result.income +
        row.totalExpectedIncome,
      expenses:
        result.expenses +
        row.totalCommitments,
      result:
        result.result +
        row.projectedResult,
    }),
    {
      income: 0,
      expenses: 0,
      result: 0,
    },
  );
}

export async function getExecutiveSnapshot(): Promise<ExecutiveSnapshot> {
  const supabase =
    await createClient();

  const bounds =
    monthBounds();

  const sevenDaysEnd =
    addDays(
      bounds.today,
      7,
    );

  const [
    bank,
    inventory,
    partners,
    supplementSalesResult,
    fitnessSalesResult,
    supplementPaidResult,
    fitnessPaidResult,
    postSaleResult,
    returnResult,
    consignmentResult,
    marketingResult,
    charges7Result,
    receivables7Result,
    flavorIntegrityResult,
  ] = await Promise.all([
    getBankDashboardData(),
    getInventoryOverview(),
    getPartnersOverview(),

    supabase
      .from("sales")
      .select(
        "id,total_amount,total_cost,total_profit",
      )
      .eq(
        "record_type",
        "sale",
      )
      .neq(
        "general_status",
        "cancelled",
      )
      .gte(
        "quoted_at",
        bounds.start,
      )
      .lt(
        "quoted_at",
        bounds.end,
      ),

    supabase
      .from(
        "fitness_sales",
      )
      .select(
        "id,total_amount,total_cost,total_profit",
      )
      .neq(
        "general_status",
        "cancelled",
      )
      .gte(
        "quoted_on",
        bounds.startDate,
      )
      .lt(
        "quoted_on",
        bounds.endDate,
      ),

    supabase
      .from("sales")
      .select(
        "total_amount,paid_at",
      )
      .eq(
        "record_type",
        "sale",
      )
      .neq(
        "general_status",
        "cancelled",
      )
      .gte(
        "paid_at",
        bounds.start,
      )
      .lt(
        "paid_at",
        bounds.end,
      ),

    supabase
      .from(
        "fitness_sales",
      )
      .select(
        "total_amount,paid_on",
      )
      .neq(
        "general_status",
        "cancelled",
      )
      .gte(
        "paid_on",
        bounds.startDate,
      )
      .lt(
        "paid_on",
        bounds.endDate,
      ),

    supabase
      .from(
        "post_sale_batches",
      )
      .select(
        "id,due_on,status",
      )
      .eq(
        "status",
        "planned",
      ),

    supabase
      .from(
        "return_cases",
      )
      .select(
        "id,status,refund_amount",
      )
      .not(
        "status",
        "in",
        "(resolved,rejected,cancelled)",
      ),

    supabase
      .from(
        "fitness_consignments",
      )
      .select(
        "id,status,expected_return_on",
      )
      .in(
        "status",
        [
          "open",
          "partial",
        ],
      ),

    supabase
      .from(
        "marketing_projects",
      )
      .select(
        "id,status,processing_status",
      ),

    supabase
      .from(
        "bank_charges_overview",
      )
      .select(
        "remaining_amount,due_date,effective_status",
      )
      .not(
        "effective_status",
        "in",
        "(paid,cancelled)",
      )
      .gte(
        "due_date",
        bounds.today,
      )
      .lte(
        "due_date",
        sevenDaysEnd,
      ),

    supabase
      .from(
        "bank_receivables_overview",
      )
      .select(
        "remaining_amount,due_date,effective_status",
      )
      .not(
        "effective_status",
        "in",
        "(received,cancelled)",
      )
      .gte(
        "due_date",
        bounds.today,
      )
      .lte(
        "due_date",
        sevenDaysEnd,
      ),

    supabase
      .from(
        "product_flavor_integrity_overview",
      )
      .select(
        "product_id,integrity_status",
      )
      .neq(
        "integrity_status",
        "healthy",
      ),
  ]);

  const results = [
    supplementSalesResult,
    fitnessSalesResult,
    supplementPaidResult,
    fitnessPaidResult,
    postSaleResult,
    returnResult,
    consignmentResult,
    marketingResult,
    charges7Result,
    receivables7Result,
  ];

  for (
    const result of results
  ) {
    if (result.error) {
      throw result.error;
    }
  }

  const supplementSales =
    aggregateSales(
      (
        supplementSalesResult.data ??
        []
      ) as Array<
        Record<
          string,
          unknown
        >
      >,
    );

  const fitnessSales =
    aggregateSales(
      (
        fitnessSalesResult.data ??
        []
      ) as Array<
        Record<
          string,
          unknown
        >
      >,
    );

  const companySales: SaleTotals =
    {
      count:
        supplementSales.count +
        fitnessSales.count,
      revenue:
        supplementSales.revenue +
        fitnessSales.revenue,
      cost:
        supplementSales.cost +
        fitnessSales.cost,
      profit:
        supplementSales.profit +
        fitnessSales.profit,
    };

  const receivedThisMonth =
    (
      supplementPaidResult.data ??
      []
    ).reduce(
      (
        sum,
        row: Record<
          string,
          unknown
        >,
      ) =>
        sum +
        number(
          row.total_amount,
        ),
      0,
    ) +
    (
      fitnessPaidResult.data ??
      []
    ).reduce(
      (
        sum,
        row: Record<
          string,
          unknown
        >,
      ) =>
        sum +
        number(
          row.total_amount,
        ),
      0,
    );

  const postSales =
    (
      postSaleResult.data ??
      []
    ) as Array<
      Record<
        string,
        unknown
      >
    >;

  const postSaleOverdue =
    postSales.filter(
      (row) =>
        text(
          row.due_on,
        ) &&
        String(
          row.due_on,
        ) <
          bounds.today,
    ).length;

  const returns =
    (
      returnResult.data ??
      []
    ) as Array<
      Record<
        string,
        unknown
      >
    >;

  const consignments =
    (
      consignmentResult.data ??
      []
    ) as Array<
      Record<
        string,
        unknown
      >
    >;

  const overdueConsignments =
    consignments.filter(
      (row) =>
        text(
          row.expected_return_on,
        ) &&
        String(
          row.expected_return_on,
        ) <
          bounds.today,
    ).length;

  const marketing =
    (
      marketingResult.data ??
      []
    ) as Array<
      Record<
        string,
        unknown
      >
    >;

  const marketingActive =
    marketing.filter(
      (row) =>
        ![
          "published",
          "archived",
          "cancelled",
        ].includes(
          String(
            row.status ??
              "",
          ),
        ),
    ).length;

  const marketingReady =
    marketing.filter(
      (row) =>
        row.processing_status ===
        "ready",
    ).length;

  const marketingPublished =
    marketing.filter(
      (row) =>
        row.status ===
        "published",
    ).length;

  const marketingErrors =
    marketing.filter(
      (row) =>
        [
          "error",
          "failed",
        ].includes(
          String(
            row.processing_status ??
              "",
          ),
        ),
    ).length;

  const lowStock =
    inventory.filter(
      (row) =>
        row.available_quantity >
          0 &&
        row.min_stock > 0 &&
        row.available_quantity <=
          row.min_stock,
    );

  const zeroStock =
    inventory.filter(
      (row) =>
        row.available_quantity <=
        0,
    );

  const activePartners =
    partners.filter(
      (row) =>
        row.active &&
        row.status !==
          "Pausado",
    );

  const partnerSettlementsPending =
    partners.filter(
      (row) =>
        row.settlement_pending,
    );

  const partnerStockUnits =
    partners.reduce(
      (
        sum,
        row,
      ) =>
        sum +
        row.linked_location_units,
      0,
    );

  const charges7 =
    (
      charges7Result.data ??
      []
    ).reduce(
      (
        sum,
        row: Record<
          string,
          unknown
        >,
      ) =>
        sum +
        number(
          row.remaining_amount,
        ),
      0,
    );

  const receivables7 =
    (
      receivables7Result.data ??
      []
    ).reduce(
      (
        sum,
        row: Record<
          string,
          unknown
        >,
      ) =>
        sum +
        number(
          row.remaining_amount,
        ),
      0,
    );

  const projections =
    bank.annualProjection
      .filter(
        (row) =>
          row.referenceMonth >=
          bounds.startDate,
      )
      .slice(0, 3);

  const projection30 =
    sumForecast(
      projections.slice(
        0,
        1,
      ),
    );

  const projection60 =
    sumForecast(
      projections.slice(
        0,
        2,
      ),
    );

  const projection90 =
    sumForecast(
      projections.slice(
        0,
        3,
      ),
    );

  const flavorIntegrityIssues =
    flavorIntegrityResult.error
      ? 0
      : (
          flavorIntegrityResult.data ??
          []
        ).length;

  const alerts: ExecutiveAlert[] =
    [];

  if (
    postSaleOverdue > 0
  ) {
    alerts.push({
      tone: "attention",
      title:
        "Pós-vendas atrasados",
      description:
        "Existem acompanhamentos planejados com data já vencida.",
      href: "/pos-venda",
      count:
        postSaleOverdue,
    });
  }

  if (
    overdueConsignments >
    0
  ) {
    alerts.push({
      tone: "attention",
      title:
        "Consignações atrasadas",
      description:
        "Peças em prova passaram da data prevista de retorno.",
      href:
        "/fitness/consignacoes",
      count:
        overdueConsignments,
    });
  }

  if (
    returns.length > 0
  ) {
    alerts.push({
      tone: "attention",
      title:
        "Trocas/devoluções abertas",
      description:
        "Ocorrências ainda aguardam resolução operacional.",
      href: "/trocas",
      count:
        returns.length,
      amount:
        returns.reduce(
          (
            sum,
            row,
          ) =>
            sum +
            number(
              row.refund_amount,
            ),
          0,
        ),
    });
  }

  if (
    zeroStock.length > 0
  ) {
    alerts.push({
      tone: "critical",
      title:
        "Produtos zerados",
      description:
        "Produtos sem saldo disponível para nova venda.",
      href: "/produtos",
      count:
        zeroStock.length,
    });
  }

  if (
    lowStock.length > 0
  ) {
    alerts.push({
      tone: "attention",
      title:
        "Estoque baixo",
      description:
        "Produtos já chegaram ao estoque mínimo configurado.",
      href: "/produtos",
      count:
        lowStock.length,
    });
  }

  if (
    partnerSettlementsPending.length >
    0
  ) {
    alerts.push({
      tone: "info",
      title:
        "Acertos de parceiros",
      description:
        "Parceiros com fechamento ou recompensa pendente de revisão.",
      href:
        "/parceiros/gerencial",
      count:
        partnerSettlementsPending.length,
    });
  }

  if (
    marketingErrors > 0
  ) {
    alerts.push({
      tone: "attention",
      title:
        "Projetos de Marketing com erro",
      description:
        "Existem projetos com processamento marcado como erro/falha.",
      href: "/marketing",
      count:
        marketingErrors,
    });
  }

  if (
    flavorIntegrityIssues >
    0
  ) {
    alerts.push({
      tone: "critical",
      title:
        "Integridade de sabores",
      description:
        "Existem produtos com divergência entre estoque agregado e sabores.",
      href:
        "/estoque/sabores",
      count:
        flavorIntegrityIssues,
    });
  }

  for (
    const item of
    bank.reviewAlerts
  ) {
    alerts.push({
      tone: "attention",
      title:
        item.title,
      description:
        item.description,
      href:
        item.href,
      count:
        item.count,
      amount:
        item.amount,
    });
  }

  return {
    generatedAt:
      new Date().toISOString(),
    referenceMonth:
      bounds.startDate,
    sales: {
      supplements:
        supplementSales,
      fitness:
        fitnessSales,
      company:
        companySales,
      receivedThisMonth,
      marginPct:
        companySales.revenue >
        0
          ? (companySales.profit /
              companySales.revenue) *
            100
          : 0,
    },
    finance: {
      cash:
        bank.summary
          .totalBalance,
      receivables:
        bank.patrimony
          .totalReceivables,
      debt:
        bank.patrimony
          .totalDebtRemaining,
      inventoryCost:
        bank.patrimony
          .totalInventoryCost,
      netPosition:
        bank.patrimony
          .totalNetPosition,
      monthlyInvested:
        bank.investment
          .company
          .monthlyInvested,
      capitalAllocated:
        bank.investment
          .company
          .capitalAllocated,
    },
    forecast: {
      next7Days: {
        label:
          "Próximos 7 dias",
        income:
          receivables7,
        expenses:
          charges7,
        result:
          receivables7 -
          charges7,
        note:
          "Somente cobranças e recebíveis já datados no Bank.",
      },
      next30Days: {
        label:
          "1 ciclo mensal",
        income:
          projection30.income,
        expenses:
          projection30.expenses,
        result:
          projection30.result,
        note:
          "Projeção cadastrada para o primeiro mês disponível no Bank.",
      },
      next60Days: {
        label:
          "2 ciclos mensais",
        income:
          projection60.income,
        expenses:
          projection60.expenses,
        result:
          projection60.result,
        note:
          "Soma dos dois primeiros meses projetados.",
      },
      next90Days: {
        label:
          "3 ciclos mensais",
        income:
          projection90.income,
        expenses:
          projection90.expenses,
        result:
          projection90.result,
        note:
          "Soma dos três primeiros meses projetados.",
      },
    },
    operations: {
      postSaleOpen:
        postSales.length,
      postSaleOverdue,
      openReturns:
        returns.length,
      overdueConsignments,
      activePartners:
        activePartners.length,
      partnerSettlementsPending:
        partnerSettlementsPending.length,
      partnerStockUnits,
      marketingActive,
      marketingReady,
      marketingPublished,
      marketingErrors,
      lowStock:
        lowStock.length,
      zeroStock:
        zeroStock.length,
      flavorIntegrityIssues,
    },
    alerts: alerts.sort(
      (
        a,
        b,
      ) => {
        const order = {
          critical: 0,
          attention: 1,
          info: 2,
        };

        return (
          order[a.tone] -
          order[b.tone]
        );
      },
    ),
    bankReviewAlerts:
      bank.reviewAlerts,
  };
}
