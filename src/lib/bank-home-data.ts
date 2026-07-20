import { createClient } from "./supabase/server";

export type BankMonthCommitment = {
  id: string;
  kind: "charge" | "invoice" | "subscription" | "debt";
  title: string;
  amount: number;
  dueDate: string | null;
  dueMode: "fixed_day" | "month_only";
  status: string;
  origin: string | null;
  href: string;
};

export type BankMonthHomeData = {
  referenceMonth: string;
  monthLabel: string;
  today: string;
  commitments: BankMonthCommitment[];
  overdue: BankMonthCommitment[];
  dueToday: BankMonthCommitment[];
  upcoming: BankMonthCommitment[];
  monthPending: BankMonthCommitment[];
  remainingMonthTotal: number;
  monthPendingTotal: number;
  overdueTotal: number;
  dueTodayTotal: number;
  monthCommitmentTotal: number;
  receivableThisMonthTotal: number;
};

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDateInSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year =
    parts.find((part) => part.type === "year")?.value ?? "1970";
  const month =
    parts.find((part) => part.type === "month")?.value ?? "01";
  const day =
    parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function monthBounds(today: string) {
  const [year, month] = today.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const nextStart = `${next.getUTCFullYear()}-${String(
    next.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;

  return { start, nextStart, year, month };
}

function safeDay(year: number, month: number, day: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return `${year}-${String(month).padStart(2, "0")}-${String(
    Math.max(1, Math.min(day, last)),
  ).padStart(2, "0")}`;
}

function dateInMonth(
  value: unknown,
  start: string,
  nextStart: string,
) {
  const date =
    typeof value === "string"
      ? value.slice(0, 10)
      : "";

  return Boolean(
    date &&
      date >= start &&
      date < nextStart,
  );
}

function monthOf(value: unknown) {
  return typeof value === "string" && value.length >= 7
    ? `${value.slice(0, 7)}-01`
    : null;
}

export async function getBankMonthHomeData(): Promise<BankMonthHomeData> {
  const supabase = await createClient();
  const today = isoDateInSaoPaulo();
  const { start, nextStart, year, month } =
    monthBounds(today);

  const [
    chargesResult,
    invoicesResult,
    subscriptionsResult,
    debtsResult,
    resolutionsResult,
    bankReceivablesResult,
    supplementReceivablesResult,
    fitnessReceivablesResult,
  ] = await Promise.all([
    supabase
      .from("bank_charges_overview")
      .select(
        "id,title,remaining_amount,effective_status,origin,due_date,charge_type,source_id,card_invoice_id",
      )
      .gte("due_date", start)
      .lt("due_date", nextStart)
      .not(
        "effective_status",
        "in",
        "(paid,cancelled)",
      )
      .order("due_date", {
        ascending: true,
      }),

    supabase
      .from("bank_card_invoice_overview")
      .select(
        "id,card_name,amount,status,due_date,origin,reference_month",
      )
      .eq("reference_month", start)
      .not(
        "status",
        "in",
        "(paid,cancelled)",
      )
      .gt("amount", 0)
      .order("due_date", {
        ascending: true,
      }),

    supabase
      .from("bank_subscriptions")
      .select(
        "id,name,provider,amount,billing_day,due_mode,origin,payment_method_type,projection_mode,billing_cycle,is_active,starts_on,ends_on",
      )
      .eq("is_active", true),

    supabase
      .from("bank_debts")
      .select(
        "id,name,creditor_name,monthly_amount,next_due_date,due_day,due_mode,origin,status,start_date",
      )
      .eq("status", "active"),

    supabase
      .from(
        "bank_month_commitment_resolutions",
      )
      .select("commitment_key")
      .eq("reference_month", start)
      .eq("resolution", "paid"),

    supabase
      .from("bank_receivables")
      .select(
        "amount,received_amount,status,due_date",
      )
      .gte("due_date", start)
      .lt("due_date", nextStart)
      .not(
        "status",
        "in",
        "(received,cancelled)",
      ),

    supabase
      .from("sales")
      .select(
        "total_amount,payment_due_at,quoted_at,payment_status,general_status,record_type",
      )
      .eq("record_type", "sale")
      .eq(
        "payment_status",
        "receivable",
      )
      .neq(
        "general_status",
        "cancelled",
      ),

    supabase
      .from("fitness_sales")
      .select(
        "total_amount,payment_due_on,quoted_on,payment_status,general_status",
      )
      .eq(
        "payment_status",
        "receivable",
      )
      .neq(
        "general_status",
        "cancelled",
      ),
  ]);

  if (chargesResult.error)
    throw chargesResult.error;
  if (invoicesResult.error)
    throw invoicesResult.error;
  if (subscriptionsResult.error)
    throw subscriptionsResult.error;
  if (debtsResult.error)
    throw debtsResult.error;
  if (resolutionsResult.error)
    throw resolutionsResult.error;
  if (bankReceivablesResult.error)
    throw bankReceivablesResult.error;
  if (supplementReceivablesResult.error)
    throw supplementReceivablesResult.error;
  if (fitnessReceivablesResult.error)
    throw fitnessReceivablesResult.error;

  const charges = (
    chargesResult.data ?? []
  ) as Array<Record<string, unknown>>;

  const sourceIds = new Set(
    charges
      .map((row) =>
        String(row.source_id ?? ""),
      )
      .filter(Boolean),
  );

  const invoiceIdsAlreadyCharged =
    new Set(
      charges
        .map((row) =>
          String(
            row.card_invoice_id ?? "",
          ),
        )
        .filter(Boolean),
    );

  const resolvedKeys = new Set(
    (resolutionsResult.data ?? []).map(
      (row) =>
        String(
          row.commitment_key ?? "",
        ),
    ),
  );

  const commitments: BankMonthCommitment[] =
    charges
      .map((row) => ({
        id: `charge:${String(row.id)}`,
        kind: "charge" as const,
        title: String(
          row.title ?? "Cobrança",
        ),
        amount: number(
          row.remaining_amount,
        ),
        dueDate: String(
          row.due_date ?? "",
        ),
        dueMode:
          "fixed_day" as const,
        status: String(
          row.effective_status ??
            "pending",
        ),
        origin:
          typeof row.origin === "string"
            ? row.origin
            : null,
        href: "/bank/cobrancas",
      }))
      .filter(
        (item) =>
          item.amount > 0 &&
          item.dueDate,
      );

  for (const row of (
    invoicesResult.data ?? []
  ) as Array<Record<string, unknown>>) {
    const id = String(row.id);

    if (
      invoiceIdsAlreadyCharged.has(id)
    ) {
      continue;
    }

    const dueDate = String(
      row.due_date ?? "",
    );
    const amount = number(row.amount);

    if (!dueDate || amount <= 0) {
      continue;
    }

    commitments.push({
      id: `invoice:${id}`,
      kind: "invoice",
      title: `Fatura ${String(
        row.card_name ?? "Cartão",
      )}`,
      amount,
      dueDate,
      dueMode: "fixed_day",
      status: String(
        row.status ?? "planned",
      ),
      origin:
        typeof row.origin === "string"
          ? row.origin
          : "Cartão",
      href: "/bank/faturas",
    });
  }

  for (const row of (
    subscriptionsResult.data ?? []
  ) as Array<Record<string, unknown>>) {
    const id = String(row.id);

    if (sourceIds.has(id)) continue;

    if (
      String(
        row.payment_method_type ?? "",
      ).toLowerCase() === "card"
    ) {
      continue;
    }

    if (
      String(
        row.projection_mode ?? "direct_charge",
      ) !== "direct_charge"
    ) {
      continue;
    }

    const startsOn =
      typeof row.starts_on === "string"
        ? row.starts_on
        : null;
    const endsOn =
      typeof row.ends_on === "string"
        ? row.ends_on
        : null;

    if (
      startsOn &&
      startsOn >= nextStart
    ) {
      continue;
    }

    if (
      endsOn &&
      endsOn < start
    ) {
      continue;
    }

    const cycle = String(
      row.billing_cycle ?? "monthly",
    ).toLowerCase();

    if (
      ["yearly", "annual"].includes(cycle)
    ) {
      const annualMonth = startsOn?.slice(5, 7);
      if (
        annualMonth &&
        annualMonth !== String(month).padStart(2, "0")
      ) {
        continue;
      }
    }

    const amount = number(row.amount);
    if (amount <= 0) continue;

    const dueMode =
      row.due_mode === "month_only"
        ? "month_only"
        : "fixed_day";

    const billingDay = number(
      row.billing_day,
    );

    if (
      dueMode === "fixed_day" &&
      !billingDay
    ) {
      continue;
    }

    commitments.push({
      id: `subscription:${id}`,
      kind: "subscription",
      title: String(
        row.name ??
          row.provider ??
          "Mensalidade",
      ),
      amount,
      dueDate:
        dueMode === "month_only"
          ? null
          : safeDay(
              year,
              month,
              billingDay,
            ),
      dueMode,
      status: "active",
      origin:
        typeof row.origin === "string"
          ? row.origin
          : "Mensalidade",
      href: "/bank/mensalidades",
    });
  }

  for (const row of (
    debtsResult.data ?? []
  ) as Array<Record<string, unknown>>) {
    const id = String(row.id);

    if (sourceIds.has(id)) continue;

    const amount = number(
      row.monthly_amount,
    );

    if (amount <= 0) continue;

    const nextDueDate =
      typeof row.next_due_date === "string"
        ? row.next_due_date
        : "";

    // Uma dívida só entra no mês ao qual o próximo pagamento realmente pertence.
    // Não recriamos uma data falsa a partir de due_day quando next_due_date já
    // aponta para outro mês.
    if (
      !nextDueDate ||
      monthOf(nextDueDate) !== start
    ) {
      continue;
    }

    const dueMode =
      row.due_mode === "month_only"
        ? "month_only"
        : "fixed_day";

    commitments.push({
      id: `debt:${id}`,
      kind: "debt",
      title: String(
        row.name ??
          row.creditor_name ??
          "Parcela",
      ),
      amount,
      dueDate:
        dueMode === "month_only"
          ? null
          : nextDueDate,
      dueMode,
      status:
        dueMode === "fixed_day" &&
        nextDueDate < today
          ? "overdue"
          : "pending",
      origin:
        typeof row.origin === "string"
          ? row.origin
          : "Dívida",
      href: "/bank/emprestimos",
    });
  }

  const unique = Array.from(
    new Map(
      commitments
        .filter(
          (item) =>
            !resolvedKeys.has(item.id),
        )
        .sort((a, b) => {
          if (
            a.dueMode === "month_only" &&
            b.dueMode !== "month_only"
          ) {
            return 1;
          }

          if (
            b.dueMode === "month_only" &&
            a.dueMode !== "month_only"
          ) {
            return -1;
          }

          return (
            String(
              a.dueDate ?? "",
            ).localeCompare(
              String(
                b.dueDate ?? "",
              ),
            ) ||
            a.title.localeCompare(
              b.title,
              "pt-BR",
            )
          );
        })
        .map((item) => [
          item.id,
          item,
        ]),
    ).values(),
  );

  const bankReceivablesTotal = (
    bankReceivablesResult.data ?? []
  ).reduce(
    (total, row) =>
      total +
      Math.max(
        number(row.amount) -
          number(
            row.received_amount,
          ),
        0,
      ),
    0,
  );

  const supplementReceivablesTotal =
    (
      supplementReceivablesResult.data ??
      []
    ).reduce((total, row) => {
      const effectiveDate =
        row.payment_due_at ??
        row.quoted_at;

      return dateInMonth(
        effectiveDate,
        start,
        nextStart,
      )
        ? total +
            number(row.total_amount)
        : total;
    }, 0);

  const fitnessReceivablesTotal = (
    fitnessReceivablesResult.data ?? []
  ).reduce((total, row) => {
    const effectiveDate =
      row.payment_due_on ??
      row.quoted_on;

    return dateInMonth(
      effectiveDate,
      start,
      nextStart,
    )
      ? total +
          number(row.total_amount)
      : total;
  }, 0);

  const monthPending = unique.filter(
    (item) =>
      item.dueMode === "month_only",
  );

  const fixed = unique.filter(
    (item) =>
      item.dueMode === "fixed_day" &&
      item.dueDate,
  );

  const overdue = fixed.filter(
    (item) =>
      Boolean(
        item.dueDate &&
          item.dueDate < today,
      ),
  );

  const dueToday = fixed.filter(
    (item) =>
      item.dueDate === today,
  );

  const upcoming = fixed.filter(
    (item) =>
      Boolean(
        item.dueDate &&
          item.dueDate > today,
      ),
  );

  const sum = (
    rows: BankMonthCommitment[],
  ) =>
    rows.reduce(
      (total, item) =>
        total + item.amount,
      0,
    );

  return {
    referenceMonth: start,
    monthLabel:
      new Intl.DateTimeFormat(
        "pt-BR",
        {
          timeZone:
            "America/Sao_Paulo",
          month: "long",
          year: "numeric",
        },
      ).format(
        new Date(
          `${start}T12:00:00-03:00`,
        ),
      ),
    today,
    commitments: unique,
    overdue,
    dueToday,
    upcoming,
    monthPending,
    remainingMonthTotal: sum([
      ...monthPending,
      ...dueToday,
      ...upcoming,
    ]),
    monthPendingTotal:
      sum(monthPending),
    overdueTotal: sum(overdue),
    dueTodayTotal: sum(dueToday),
    monthCommitmentTotal:
      sum(unique),
    receivableThisMonthTotal:
      bankReceivablesTotal +
      supplementReceivablesTotal +
      fitnessReceivablesTotal,
  };
}
