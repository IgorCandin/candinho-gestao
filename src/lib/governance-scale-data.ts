import type {
  CentralGovernanceAuditEvent,
} from "@/lib/central-data";
import { createClient } from "@/lib/supabase/server";

export type GovernanceAuditPage = {
  items:
    CentralGovernanceAuditEvent[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function number(
  value: unknown,
  fallback: number,
) {
  const result =
    Number(value);

  return Number.isFinite(
    result,
  )
    ? result
    : fallback;
}

export async function getCentralGovernanceAuditPage(
  page = 1,
  pageSize = 30,
): Promise<GovernanceAuditPage> {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase.rpc(
      "central_governance_audit_page",
      {
        p_page: page,
        p_page_size:
          pageSize,
      },
    );

  if (error) throw error;

  const payload =
    data &&
    typeof data === "object"
      ? data as Record<
          string,
          unknown
        >
      : {};

  return {
    items:
      Array.isArray(
        payload.items,
      )
        ? payload.items as
            CentralGovernanceAuditEvent[]
        : [],
    page:
      number(
        payload.page,
        1,
      ),
    pageSize:
      number(
        payload.page_size,
        pageSize,
      ),
    total:
      number(
        payload.total,
        0,
      ),
    totalPages:
      number(
        payload.total_pages,
        1,
      ),
  };
}
