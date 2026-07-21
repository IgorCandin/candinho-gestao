import { Search } from "lucide-react";

export function CommercialSearchForm({
  action,
  defaultValue = "",
  hidden = {},
  placeholder = "Buscar...",
}: {
  action: string;
  defaultValue?: string;
  hidden?: Record<string, string | undefined>;
  placeholder?: string;
}) {
  return (
    <form className="commercial-search-form" action={action} method="get">
      {Object.entries(hidden).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}

      <label>
        <Search size={16} />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      </label>

      <button className="button ghost compact-button" type="submit">
        Buscar
      </button>
    </form>
  );
}
