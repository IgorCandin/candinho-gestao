"use client";

import Link from "next/link";
import { ArrowUpRight, Dumbbell, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type PhysiqueTrainingPlanBrowserItem = {
  id: string;
  title: string;
  athleteName: string;
  goal: string;
  status: string;
  sourceType: string;
  daysCount: number;
  exerciseCount: number;
  updatedAt: string;
};

type Filter = "active" | "history" | "all";

export function PhysiqueTrainingPlanBrowser({
  plans,
}: {
  plans: PhysiqueTrainingPlanBrowserItem[];
}) {
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    return plans.filter((plan) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" ? plan.status === "active" : plan.status !== "active");

      if (!matchesFilter) return false;
      if (!query) return true;

      return `${plan.title} ${plan.athleteName} ${plan.goal}`
        .toLocaleLowerCase("pt-BR")
        .includes(query);
    });
  }, [filter, plans, search]);

  return (
    <div className="physique-ux-browser">
      <div className="physique-ux-browser-toolbar">
        <div className="physique-ux-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar atleta, ficha ou objetivo..."
          />
        </div>

        <div className="physique-ux-segmented">
          {[
            ["active", "Ativas"],
            ["history", "Histórico"],
            ["all", "Todas"],
          ].map(([value, label]) => (
            <button
              className={filter === value ? "active" : ""}
              key={value}
              onClick={() => setFilter(value as Filter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="physique-empty">
          <Dumbbell size={28} />
          <strong>Nenhuma ficha encontrada</strong>
          <p>Ajuste a busca ou o filtro para visualizar outras fichas.</p>
        </div>
      ) : (
        <div className="physique-ux-plan-grid">
          {visible.map((plan) => (
            <Link className="physique-ux-plan-card" href={`/physique/fichas/${plan.id}`} key={plan.id}>
              <div className="physique-ux-plan-card-top">
                <span className={`physique-ux-status ${plan.status === "active" ? "active" : ""}`}>
                  {plan.status === "active" ? "Ativa" : plan.status}
                </span>
                <ArrowUpRight size={16} />
              </div>

              <small>{plan.athleteName}</small>
              <strong>{plan.title}</strong>
              <p>{plan.goal}</p>

              <div className="physique-ux-plan-kpis">
                <span><b>{plan.daysCount}</b> treinos</span>
                <span><b>{plan.exerciseCount}</b> exercícios</span>
              </div>

              <footer>
                <span>{plan.sourceType === "ai_pdf" ? "Estruturada pelo Nexus" : plan.sourceType}</span>
                <span>{new Date(plan.updatedAt).toLocaleDateString("pt-BR")}</span>
              </footer>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
