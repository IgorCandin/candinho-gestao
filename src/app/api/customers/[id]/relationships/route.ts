import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { getCustomerNetworkContext } from "@/lib/nexus-operating-context";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

async function ensureWrite() {
  const access = await getCurrentUserAccess();
  return access.active && (access.role === "admin" || access.canWriteSupplements);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();
  if (!access.active || !access.canAccessSupplements) {
    return NextResponse.json({ error: "Sem acesso ao CRM." }, { status: 403 });
  }

  const { id } = await params;
  const compact = new URL(request.url).searchParams.get("compact") === "1";
  const network = await getCustomerNetworkContext(id);

  if (compact) {
    return NextResponse.json({ network });
  }

  const supabase = await createClient();

  const [customerResult, partnerResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,city,phone")
      .eq("active", true)
      .neq("id", id)
      .order("name")
      .limit(500),
    supabase
      .from("partners")
      .select("id,name,partner_type,city")
      .eq("active", true)
      .neq("partner_type", "supplier")
      .order("name")
      .limit(200),
  ]);

  if (customerResult.error) {
    return NextResponse.json({ error: customerResult.error.message }, { status: 500 });
  }
  if (partnerResult.error) {
    return NextResponse.json({ error: partnerResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    network,
    customers: customerResult.data ?? [],
    partners: partnerResult.data ?? [],
  });
}

async function addCustomerRelationship(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  source: Record<string, unknown>,
) {
  const relatedCustomerId = clean(source.related_customer_id, 80);
  const relationType = clean(source.relation_type, 80) ?? "other";

  if (!relatedCustomerId || relatedCustomerId === customerId) {
    throw new Error("Selecione outro cliente para o vínculo.");
  }

  const { error } = await supabase.from("customer_relationships").upsert(
    {
      customer_id: customerId,
      related_customer_id: relatedCustomerId,
      relation_type: relationType,
      relation_label: clean(source.relation_label, 120),
      notes: clean(source.notes, 800),
      active: true,
    },
    { onConflict: "customer_id,related_customer_id,relation_type" },
  );

  if (error) throw new Error(error.message);
}

async function addPartnerAffiliation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  source: Record<string, unknown>,
) {
  const partnerId = clean(source.partner_id, 80);
  if (!partnerId) throw new Error("Selecione o parceiro.");

  const isPrimary = source.is_primary !== false;

  if (isPrimary) {
    const { error: primaryError } = await supabase
      .from("customer_partner_affiliations")
      .update({ is_primary: false })
      .eq("customer_id", customerId)
      .eq("active", true);

    if (primaryError) throw new Error(primaryError.message);
  }

  const { error } = await supabase.from("customer_partner_affiliations").upsert(
    {
      customer_id: customerId,
      partner_id: partnerId,
      relation_type: clean(source.relation_type, 80) ?? "client_of_partner",
      relation_label: clean(source.relation_label, 120),
      counts_for_partnership: source.counts_for_partnership !== false,
      auto_attribute_sales: source.auto_attribute_sales !== false,
      is_primary: isPrimary,
      priority: Math.min(Math.max(Number(source.priority ?? 100) || 100, 0), 1000),
      valid_from: clean(source.valid_from, 10),
      valid_until: clean(source.valid_until, 10),
      notes: clean(source.notes, 800),
      active: true,
    },
    { onConflict: "customer_id,partner_id,relation_type" },
  );

  if (error) throw new Error(error.message);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await ensureWrite())) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const supabase = await createClient();

  try {
    if (body.kind === "bulk") {
      const relationships = Array.isArray(body.relationships)
        ? body.relationships
        : [];
      const affiliations = Array.isArray(body.affiliations)
        ? body.affiliations
        : [];

      for (const value of relationships) {
        if (value && typeof value === "object") {
          await addCustomerRelationship(
            supabase,
            id,
            value as Record<string, unknown>,
          );
        }
      }

      for (const value of affiliations) {
        if (value && typeof value === "object") {
          await addPartnerAffiliation(
            supabase,
            id,
            value as Record<string, unknown>,
          );
        }
      }
    } else if (body.kind === "partner") {
      await addPartnerAffiliation(supabase, id, body);
    } else {
      await addCustomerRelationship(supabase, id, body);
    }

    // Atualiza os sinais e aplica o tuning para a fila diária não ser dominada
    // por leads históricos antigos.
    await supabase.rpc("refresh_nexus_operating_layer_v2");

    return NextResponse.json({
      ok: true,
      network: await getCustomerNetworkContext(id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o vínculo.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await ensureWrite())) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const recordId = clean(body.id, 80);
  const kind = body.kind === "partner" ? "partner" : "customer";

  if (!recordId) {
    return NextResponse.json({ error: "Vínculo inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const table =
    kind === "partner"
      ? "customer_partner_affiliations"
      : "customer_relationships";

  let query = supabase.from(table).delete().eq("id", recordId);

  if (kind === "partner") {
    query = query.eq("customer_id", id);
  } else {
    query = query.or(`customer_id.eq.${id},related_customer_id.eq.${id}`);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("refresh_nexus_operating_layer_v2");

  return NextResponse.json({
    ok: true,
    network: await getCustomerNetworkContext(id),
  });
}
