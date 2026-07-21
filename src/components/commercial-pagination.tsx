import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function buildHref(
  pathname: string,
  page: number,
  params: Record<string, string | undefined>,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  if (page > 1) search.set("page", String(page));

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function CommercialPagination({
  pathname,
  page,
  totalPages,
  total,
  pageSize,
  params = {},
}: {
  pathname: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  params?: Record<string, string | undefined>;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="commercial-pagination">
      <span>
        Mostrando <strong>{from}–{to}</strong> de <strong>{total}</strong>
      </span>

      <div>
        {page > 1 ? (
          <Link
            className="button ghost compact-button"
            href={buildHref(pathname, page - 1, params)}
          >
            <ChevronLeft size={15} />
            Anterior
          </Link>
        ) : (
          <span className="button ghost compact-button disabled">
            <ChevronLeft size={15} />
            Anterior
          </span>
        )}

        <b>{page} / {totalPages}</b>

        {page < totalPages ? (
          <Link
            className="button ghost compact-button"
            href={buildHref(pathname, page + 1, params)}
          >
            Próxima
            <ChevronRight size={15} />
          </Link>
        ) : (
          <span className="button ghost compact-button disabled">
            Próxima
            <ChevronRight size={15} />
          </span>
        )}
      </div>
    </div>
  );
}
