"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

type PeriodKey = "7d" | "30d" | "3m" | "6m" | "12m";
type ViewMode = "period" | "accumulated";

type ProfitPoint = {
  key: string;
  label: string;
  fullLabel: string;
  profit: number;
  revenue: number;
  salesCount: number;
};

type ProfitEvolutionResponse = {
  period: PeriodKey;
  periodLabel: string;
  bucket: "day" | "week" | "month";
  currentTotal: number;
  currentRevenue: number;
  currentSales: number;
  previousTotal: number;
  percentageChange: number | null;
  averageActive: number;
  bestPoint: ProfitPoint | null;
  points: ProfitPoint[];
  error?: string;
};

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "3m", label: "3 meses" },
  { key: "6m", label: "6 meses" },
  { key: "12m", label: "12 meses" },
];

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 10_000 ? 1 : 0,
  }).format(value);
}

function margin(profit: number, revenue: number) {
  if (revenue <= 0) return "—";
  return `${((profit / revenue) * 100).toFixed(1).replace(".", ",")}%`;
}

function ProfitEvolutionChart() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [mode, setMode] = useState<ViewMode>("period");
  const [data, setData] = useState<ProfitEvolutionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage(null);
      setHoveredIndex(null);

      try {
        const response = await fetch(
          `/api/painel-cs/evolucao-lucro?period=${period}`,
          { cache: "no-store" },
        );

        const payload = (await response.json()) as ProfitEvolutionResponse;

        if (!response.ok) {
          throw new Error(
            payload.error || "Não foi possível carregar a evolução do lucro.",
          );
        }

        if (!cancelled) setData(payload);
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a evolução do lucro.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [period]);

  const chartPoints = useMemo(() => {
    if (!data) return [];

    let accumulated = 0;

    return data.points.map((point) => {
      accumulated += point.profit;

      return {
        ...point,
        displayValue: mode === "accumulated" ? accumulated : point.profit,
      };
    });
  }, [data, mode]);

  const geometry = useMemo(() => {
    const width = 1000;
    const height = 320;
    const padding = { top: 28, right: 24, bottom: 48, left: 76 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(
      1,
      ...chartPoints.map((point) => point.displayValue),
    );
    const count = Math.max(1, chartPoints.length - 1);

    const points = chartPoints.map((point, index) => {
      const x = padding.left + (plotWidth * index) / count;
      const y =
        padding.top +
        plotHeight -
        (point.displayValue / maxValue) * plotHeight;

      return { ...point, x, y };
    });

    const linePath = points.length
      ? points
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
          )
          .join(" ")
      : "";

    const areaPath = points.length
      ? `${linePath} L ${points[points.length - 1].x} ${
          padding.top + plotHeight
        } L ${points[0].x} ${padding.top + plotHeight} Z`
      : "";

    const grid = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;

      return {
        y: padding.top + plotHeight * ratio,
        value: maxValue * (1 - ratio),
      };
    });

    return {
      width,
      height,
      padding,
      plotHeight,
      points,
      linePath,
      areaPath,
      grid,
    };
  }, [chartPoints]);

  const comparisonClass =
    data?.percentageChange === null
      ? "neutral"
      : (data?.percentageChange ?? 0) >= 0
        ? "positive"
        : "negative";

  const comparisonText = !data
    ? "Carregando comparação..."
    : data.percentageChange === null
      ? "Sem base no período anterior"
      : `${data.percentageChange >= 0 ? "↑" : "↓"} ${Math.abs(
          data.percentageChange,
        )
          .toFixed(1)
          .replace(".", ",")}% vs. período anterior`;

  const hovered =
    hoveredIndex !== null && geometry.points[hoveredIndex]
      ? geometry.points[hoveredIndex]
      : null;

  const xLabelStep = Math.max(1, Math.ceil(chartPoints.length / 6));

  return (
    <article className="panel profit-evolution-panel">
      <div className="profit-evolution-head">
        <div>
          <span className="profit-evolution-eyebrow">
            Inteligência financeira
          </span>
          <h2>Evolução do lucro</h2>
          <p>
            Passe o mouse ou toque em um ponto para ver vendas, valor bruto,
            lucro e margem daquele intervalo.
          </p>
        </div>

        <div className="profit-evolution-periods">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={period === item.key ? "active" : ""}
              onClick={() => setPeriod(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="profit-evolution-summary">
        <div className="profit-evolution-total">
          <span>Lucro no período</span>
          <strong>{data ? money(data.currentTotal) : "—"}</strong>
          <small className={comparisonClass}>
            {data ? comparisonText : "Carregando comparação..."}
          </small>
        </div>

        <div className="profit-evolution-mini-stat">
          <span>Melhor período</span>
          <strong>
            {data?.bestPoint ? money(data.bestPoint.profit) : "—"}
          </strong>
          <small>{data?.bestPoint?.fullLabel ?? "Sem vendas no período"}</small>
        </div>

        <div className="profit-evolution-mini-stat">
          <span>Média com movimento</span>
          <strong>{data ? money(data.averageActive) : "—"}</strong>
          <small>Considera somente períodos com lucro</small>
        </div>

        <div className="profit-evolution-mode">
          <button
            type="button"
            className={mode === "period" ? "active" : ""}
            onClick={() => setMode("period")}
          >
            Por período
          </button>
          <button
            type="button"
            className={mode === "accumulated" ? "active" : ""}
            onClick={() => setMode("accumulated")}
          >
            Acumulado
          </button>
        </div>
      </div>

      <div className="profit-chart-shell">
        {loading && (
          <div className="profit-chart-state">
            <span className="profit-chart-loader" />
            Carregando evolução...
          </div>
        )}

        {!loading && message && (
          <div className="profit-chart-state error">{message}</div>
        )}

        {!loading && !message && data && (
          <>
            <svg
              className="profit-chart"
              viewBox={`0 0 ${geometry.width} ${geometry.height}`}
              role="img"
              aria-label={`Gráfico da evolução do lucro nos últimos ${data.periodLabel}`}
            >
              <defs>
                <linearGradient
                  id="profitEvolutionArea"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgba(217,166,61,.36)" />
                  <stop offset="100%" stopColor="rgba(217,166,61,.02)" />
                </linearGradient>
                <filter
                  id="profitEvolutionGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {geometry.grid.map((line) => (
                <g key={line.y}>
                  <line
                    x1={geometry.padding.left}
                    x2={geometry.width - geometry.padding.right}
                    y1={line.y}
                    y2={line.y}
                    className="profit-chart-grid"
                  />
                  <text
                    x={geometry.padding.left - 12}
                    y={line.y + 4}
                    textAnchor="end"
                    className="profit-chart-y-label"
                  >
                    {compactMoney(line.value)}
                  </text>
                </g>
              ))}

              {geometry.areaPath && (
                <path d={geometry.areaPath} fill="url(#profitEvolutionArea)" />
              )}

              {geometry.linePath && (
                <path
                  d={geometry.linePath}
                  className="profit-chart-line"
                  filter="url(#profitEvolutionGlow)"
                />
              )}

              {geometry.points.map((point, index) => {
                const shouldLabel =
                  index === 0 ||
                  index === geometry.points.length - 1 ||
                  index % xLabelStep === 0;

                return (
                  <g key={point.key}>
                    {shouldLabel && (
                      <text
                        x={point.x}
                        y={geometry.height - 16}
                        textAnchor="middle"
                        className="profit-chart-x-label"
                      >
                        {point.label}
                      </text>
                    )}

                    {hoveredIndex === index && (
                      <line
                        x1={point.x}
                        x2={point.x}
                        y1={geometry.padding.top}
                        y2={geometry.padding.top + geometry.plotHeight}
                        className="profit-chart-hover-line"
                      />
                    )}

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={hoveredIndex === index ? 6 : 3.5}
                      className="profit-chart-point"
                    />

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={18}
                      fill="transparent"
                      className="profit-chart-hit"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() =>
                        setHoveredIndex((current) =>
                          current === index ? null : index,
                        )
                      }
                      onTouchStart={() => setHoveredIndex(index)}
                    />
                  </g>
                );
              })}
            </svg>

            {hovered && (
              <div
                className="profit-chart-tooltip"
                style={{
                  left: `${Math.min(
                    88,
                    Math.max(12, (hovered.x / geometry.width) * 100),
                  )}%`,
                  top: `${Math.max(
                    10,
                    (hovered.y / geometry.height) * 100,
                  )}%`,
                }}
              >
                <span className="profit-tooltip-period">
                  {hovered.fullLabel}
                </span>

                <div className="profit-tooltip-row">
                  <span>Vendas</span>
                  <b>{hovered.salesCount}</b>
                </div>

                <div className="profit-tooltip-row">
                  <span>Valor bruto</span>
                  <b>{money(hovered.revenue)}</b>
                </div>

                <div className="profit-tooltip-row">
                  <span>Lucro</span>
                  <b className="profit-tooltip-highlight">
                    {money(hovered.profit)}
                  </b>
                </div>

                <div className="profit-tooltip-row">
                  <span>Margem</span>
                  <b>{margin(hovered.profit, hovered.revenue)}</b>
                </div>

                {mode === "accumulated" && (
                  <div className="profit-tooltip-accumulated">
                    <span>Lucro acumulado</span>
                    <strong>{money(hovered.displayValue)}</strong>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="profit-evolution-foot">
        <span>
          {mode === "period"
            ? "Cada ponto mostra o resultado daquele intervalo."
            : "A curva soma o lucro progressivamente; o tooltip mantém os dados daquele intervalo."}
        </span>
        <span>Base: vendas entregues e não canceladas.</span>
      </div>

      <style>{`
        .profit-evolution-panel{margin-bottom:14px;overflow:hidden}
        .profit-evolution-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:20px 22px 16px;border-bottom:1px solid rgba(148,163,184,.1)}
        .profit-evolution-eyebrow{display:block;margin-bottom:6px;color:#d9a63d;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
        .profit-evolution-head h2{margin:0;font-size:17px}.profit-evolution-head p{margin:5px 0 0;color:#8f98a8;font-size:12px}
        .profit-evolution-periods,.profit-evolution-mode{display:flex;gap:4px;padding:4px;border:1px solid rgba(148,163,184,.12);border-radius:12px;background:rgba(8,11,17,.46)}
        .profit-evolution-periods button,.profit-evolution-mode button{border:0;border-radius:8px;background:transparent;color:#8f98a8;font:inherit;font-size:11px;font-weight:700;cursor:pointer;transition:.18s ease}
        .profit-evolution-periods button{min-height:31px;padding:0 10px}.profit-evolution-mode button{min-height:30px;padding:0 11px}
        .profit-evolution-periods button:hover,.profit-evolution-mode button:hover{color:#fff}
        .profit-evolution-periods button.active,.profit-evolution-mode button.active{background:rgba(217,166,61,.14);color:#e9bc59;box-shadow:inset 0 0 0 1px rgba(217,166,61,.2)}
        .profit-evolution-summary{display:grid;grid-template-columns:minmax(180px,1.25fr) minmax(145px,.8fr) minmax(160px,.9fr) auto;gap:12px;align-items:stretch;padding:16px 22px 4px}
        .profit-evolution-total,.profit-evolution-mini-stat{min-width:0;padding:12px 14px;border:1px solid rgba(148,163,184,.1);border-radius:12px;background:rgba(8,11,17,.3)}
        .profit-evolution-total span,.profit-evolution-mini-stat span{display:block;color:#8f98a8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
        .profit-evolution-total strong{display:block;margin-top:5px;color:#f5f7fa;font-size:24px;letter-spacing:-.03em}.profit-evolution-mini-stat strong{display:block;margin-top:5px;color:#f5f7fa;font-size:17px}
        .profit-evolution-total small,.profit-evolution-mini-stat small{display:block;margin-top:3px;color:#727c8d;font-size:10px}.profit-evolution-total small.positive{color:#43ca78}.profit-evolution-total small.negative{color:#e16d72}.profit-evolution-total small.neutral{color:#8f98a8}
        .profit-evolution-mode{align-self:center}.profit-chart-shell{position:relative;min-height:300px;padding:8px 16px 0 8px}.profit-chart{display:block;width:100%;height:auto;min-height:275px;overflow:visible}
        .profit-chart-grid{stroke:rgba(148,163,184,.1);stroke-width:1;stroke-dasharray:4 5}.profit-chart-y-label,.profit-chart-x-label{fill:#717b8c;font-size:10px;font-weight:600}
        .profit-chart-line{fill:none;stroke:#d9a63d;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.profit-chart-point{fill:#e4b74f;stroke:#171b24;stroke-width:2;transition:r .15s ease}.profit-chart-hit{cursor:crosshair;touch-action:manipulation}.profit-chart-hover-line{stroke:rgba(217,166,61,.35);stroke-width:1;stroke-dasharray:4 4}
        .profit-chart-tooltip{position:absolute;z-index:6;min-width:190px;padding:11px 12px;border:1px solid rgba(217,166,61,.3);border-radius:11px;background:rgba(10,13,19,.97);box-shadow:0 14px 34px rgba(0,0,0,.38);transform:translate(-50%,calc(-100% - 14px));pointer-events:none}
        .profit-tooltip-period{display:block;margin-bottom:7px;color:#e9bc59;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.profit-tooltip-row{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:3px 0}.profit-tooltip-row span{color:#8f98a8;font-size:9px}.profit-tooltip-row b{color:#eef1f5;font-size:10px;white-space:nowrap}.profit-tooltip-row .profit-tooltip-highlight{color:#f4c762;font-size:12px}
        .profit-tooltip-accumulated{margin-top:7px;padding-top:7px;border-top:1px solid rgba(148,163,184,.12)}.profit-tooltip-accumulated span,.profit-tooltip-accumulated strong{display:block}.profit-tooltip-accumulated span{color:#8f98a8;font-size:8px}.profit-tooltip-accumulated strong{margin-top:2px;color:#f4c762;font-size:13px}
        .profit-chart-state{display:flex;min-height:280px;align-items:center;justify-content:center;gap:9px;color:#8f98a8;font-size:12px}.profit-chart-state.error{color:#e16d72}.profit-chart-loader{width:16px;height:16px;border:2px solid rgba(217,166,61,.22);border-top-color:#d9a63d;border-radius:50%;animation:profitSpin .8s linear infinite}
        .profit-evolution-foot{display:flex;justify-content:space-between;gap:16px;padding:5px 22px 16px;color:#667080;font-size:10px}@keyframes profitSpin{to{transform:rotate(360deg)}}
        @media(max-width:980px){.profit-evolution-head{flex-direction:column}.profit-evolution-periods{width:100%;overflow-x:auto}.profit-evolution-periods button{flex:1 0 auto}.profit-evolution-summary{grid-template-columns:repeat(3,1fr)}.profit-evolution-mode{grid-column:1/-1;justify-self:start}}
        @media(max-width:700px){.profit-evolution-head,.profit-evolution-summary{padding-left:14px;padding-right:14px}.profit-evolution-summary{grid-template-columns:1fr 1fr}.profit-evolution-total{grid-column:1/-1}.profit-evolution-mini-stat:nth-child(3){grid-column:1/-1}.profit-chart-shell{min-height:260px;padding-left:0;padding-right:6px;overflow-x:auto;overflow-y:visible}.profit-chart{width:760px;max-width:none;min-height:245px}.profit-chart-tooltip{position:fixed;left:50%!important;top:auto!important;bottom:108px;width:min(290px,calc(100vw - 34px));transform:translateX(-50%)}.profit-evolution-foot{flex-direction:column;padding-left:14px;padding-right:14px}}
      `}</style>
    </article>
  );
}

export function ProfitEvolutionPortal() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const existing = document.getElementById("profit-evolution-panel-anchor");

    if (existing) {
      const frame = window.requestAnimationFrame(() => setTarget(existing));
      return () => window.cancelAnimationFrame(frame);
    }

    const headings = Array.from(document.querySelectorAll("h2"));
    const salesHeading = headings.find(
      (heading) =>
        heading.textContent?.trim().toLowerCase() === "vendas do período",
    );
    const salesBlock = salesHeading?.closest("article, section");
    const parent = salesBlock?.parentElement;

    const anchor = document.createElement("div");
    anchor.id = "profit-evolution-panel-anchor";
    anchor.className = "profit-evolution-panel-anchor";

    if (salesBlock && parent) {
      parent.insertBefore(anchor, salesBlock);
    } else {
      const fallback =
        document.querySelector(".content") ||
        document.querySelector("main") ||
        document.body;

      fallback.appendChild(anchor);
    }

    const frame = window.requestAnimationFrame(() => setTarget(anchor));

    return () => {
      window.cancelAnimationFrame(frame);
      anchor.remove();
    };
  }, []);

  return target ? createPortal(<ProfitEvolutionChart />, target) : null;
}
