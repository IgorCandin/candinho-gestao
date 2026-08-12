$ErrorActionPreference = "Stop"

function Fail([string]$message) {
  throw $message
}

function Read-Utf8([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    Fail "Arquivo nao encontrado: $path"
  }
  $resolved = (Get-Item -LiteralPath $path).FullName
  return [System.IO.File]::ReadAllText(
    $resolved,
    [System.Text.Encoding]::UTF8
  ).Replace("`r`n","`n")
}

function Write-Utf8([string]$path, [string]$content) {
  $fullPath = [System.IO.Path]::GetFullPath($path)
  $parent = Split-Path -Parent $fullPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  [System.IO.File]::WriteAllText(
    $fullPath,
    $content.Replace("`r`n","`n"),
    (New-Object System.Text.UTF8Encoding($false))
  )
}

function Replace-Once(
  [string]$content,
  [string]$old,
  [string]$new,
  [string]$label
) {
  # O arquivo lido e normalizado para LF. Here-strings do Windows PowerShell
  # chegam em CRLF, entao normalizamos os dois lados antes de comparar.
  $contentN = $content.Replace("`r`n","`n")
  $oldN = $old.Replace("`r`n","`n")
  $newN = $new.Replace("`r`n","`n")

  $first = $contentN.IndexOf($oldN)
  if ($first -lt 0) {
    Fail "Nao encontrei o trecho esperado: $label"
  }

  $second = $contentN.IndexOf($oldN, $first + $oldN.Length)
  if ($second -ge 0) {
    Fail "O trecho apareceu mais de uma vez e o instalador nao vai arriscar: $label"
  }

  return $contentN.Substring(0, $first) + $newN + $contentN.Substring($first + $oldN.Length)
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.23.4 R2 - Comercial fluido e regressao corrigida" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 0. Retomada segura apos tentativa parcial
# ---------------------------------------------------------------------------

$trackedTargets = @(
  "src/app/(app)/vendas/nova/page.tsx",
  "src/components/new-sale-form.tsx",
  "src/components/budget-confirmed-flow-ux.tsx",
  "src/app/v45-15-commercial-flow.css"
)

$dirtyTargets = @(& git diff --name-only -- $trackedTargets)
$stagedTargets = @(& git diff --cached --name-only -- $trackedTargets)

if ($dirtyTargets.Count -gt 0 -or $stagedTargets.Count -gt 0) {
  Write-Host "Alteracoes locais encontradas nos arquivos que a V45.23.4 precisa editar:" -ForegroundColor Yellow
  $dirtyTargets | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  $stagedTargets | ForEach-Object { Write-Host " - $_ (staged)" -ForegroundColor Yellow }
  Fail "Nao vou sobrescrever trabalho local. Se essas alteracoes forem da tentativa V45.23.4 anterior, mande um print do GitHub Desktop antes de continuar."
}

$partialGenerated = @(
  "src/components/sale-product-combobox-v45-23-4.tsx",
  "src/components/commercial-budget-optional-panels-v45-23-4.tsx"
)

foreach ($path in $partialGenerated) {
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Force
  }
}

Write-Host "Retomada segura pronta; componentes parciais anteriores foram limpos." -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
# 1. Novo combobox pesquisavel de produto
# ---------------------------------------------------------------------------

$productPickerPath = "src/components/sale-product-combobox-v45-23-4.tsx"

$productPicker = @'
"use client";

import { Check, PackageSearch, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type SaleProductSearchOptionV45234 = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  available: number;
  physical: number;
  locationCode: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function SaleProductComboboxV45234({
  options,
  value,
  onChange,
}: {
  options: SaleProductSearchOptionV45234[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected =
    options.find((option) => option.id === value) ?? null;

  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    setQuery(selected?.name ?? "");
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());

    const rows = !needle
      ? options
      : options.filter((option) =>
          normalize(
            `${option.name} ${option.brand ?? ""} ${option.category}`,
          ).includes(needle),
        );

    return [...rows]
      .sort((a, b) => {
        const stockDelta =
          Number(b.available > 0) - Number(a.available > 0);

        if (stockDelta !== 0) return stockDelta;

        return a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, 40);
  }, [options, query]);

  return (
    <div className="sale-product-combobox-v45234" ref={rootRef}>
      <div
        className={`sale-product-combobox-input-v45234 ${
          open ? "open" : ""
        }`}
      >
        <Search size={17} />
        <input
          className="input"
          value={query}
          required
          autoComplete="off"
          placeholder="Digite creatina, whey, marca..."
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);

            if (value) {
              onChange("");
            }
          }}
        />
        {selected && <Check size={16} />}
      </div>

      {open && (
        <div className="sale-product-combobox-menu-v45234">
          {filtered.length > 0 ? (
            filtered.map((option) => {
              const available = option.available > 0;

              return (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    available ? "has-stock" : "no-stock",
                    option.id === value ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    onChange(option.id);
                    setQuery(option.name);
                    setOpen(false);
                  }}
                >
                  <PackageSearch size={17} />
                  <span>
                    <strong>{option.name}</strong>
                    <small>
                      {[option.brand, option.category]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  <em>
                    {available
                      ? `${option.available} disp. · ${option.locationCode}`
                      : `Sem estoque · ${option.locationCode}`}
                  </em>
                  {option.id === value && <Check size={15} />}
                </button>
              );
            })
          ) : (
            <div className="sale-product-combobox-empty-v45234">
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
'@

Write-Utf8 $productPickerPath $productPicker.TrimStart()
Write-Host "Busca digitavel de produtos criada." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 2. UX opcional: Ajustes/brinde e Observacoes fechados por padrao
# ---------------------------------------------------------------------------

$optionalUxPath = "src/components/commercial-budget-optional-panels-v45-23-4.tsx"

$optionalUx = @'
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TARGETS = new Map([
  [
    "Ajustes do valor e brinde",
    "Desconto, lucro combinado ou brinde",
  ],
  [
    "Observações",
    "Informações opcionais para o orçamento/PDF",
  ],
]);

export function CommercialBudgetOptionalPanelsV45234() {
  const pathname = usePathname();

  useEffect(() => {
    const active =
      pathname === "/vendas/nova" ||
      pathname === "/suplementos/vendas/nova";

    if (!active) return;

    const cleanups: Array<() => void> = [];

    function enhance() {
      for (const panel of document.querySelectorAll<HTMLElement>(
        ".new-sale-main > article.panel",
      )) {
        if (panel.dataset.v45234Optional === "1") continue;

        const title =
          panel.querySelector<HTMLElement>(".panel-head h2")
            ?.textContent?.trim() ?? "";

        const helper = TARGETS.get(title);
        if (!helper) continue;

        const head = panel.querySelector<HTMLElement>(".panel-head");
        const body = panel.querySelector<HTMLElement>(".panel-body");
        if (!head || !body) continue;

        panel.dataset.v45234Optional = "1";
        panel.classList.add("v45234-optional-panel");

        const button = document.createElement("button");
        button.type = "button";
        button.className = "v45234-optional-toggle";
        button.innerHTML = `
          <span>
            <b>Opcional</b>
            <small>${helper}</small>
          </span>
          <span data-state>Abrir</span>
        `;

        const icon = document.createElement("span");
        icon.className = "v45234-optional-toggle-icon";
        head.append(button);
        button.append(icon);

        const sync = () => {
          const open = panel.classList.contains("is-open");
          const state = button.querySelector<HTMLElement>("[data-state]");
          if (state) state.textContent = open ? "Fechar" : "Abrir";
          button.setAttribute("aria-expanded", open ? "true" : "false");
        };

        const onClick = () => {
          panel.classList.toggle("is-open");
          sync();
        };

        button.addEventListener("click", onClick);
        sync();

        cleanups.push(() => {
          button.removeEventListener("click", onClick);
          button.remove();
          panel.classList.remove(
            "v45234-optional-panel",
            "is-open",
          );
          delete panel.dataset.v45234Optional;
        });
      }
    }

    enhance();

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [pathname]);

  return null;
}
'@

Write-Utf8 $optionalUxPath $optionalUx.TrimStart()
Write-Host "Paineis opcionais preparados." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 3. Pagina de Novo Orcamento: liga o UX opcional
#    Parceria automatica sera resolvida no cliente, dentro do NewSaleForm.
# ---------------------------------------------------------------------------

$pagePath = "src/app/(app)/vendas/nova/page.tsx"
$page = Read-Utf8 $pagePath

if (-not $page.Contains("CommercialBudgetOptionalPanelsV45234")) {
  $page = Replace-Once $page `
    'import { CommercialSaleRefinementUX } from "@/components/commercial-sale-refinement-ux";' `
    ('import { CommercialSaleRefinementUX } from "@/components/commercial-sale-refinement-ux";' + "`n" +
     'import { CommercialBudgetOptionalPanelsV45234 } from "@/components/commercial-budget-optional-panels-v45-23-4";') `
    "import do UX opcional"

  $page = Replace-Once $page `
@'
      <NewSaleForm
        customers={customers}
        locations={locations}
        partners={partners}
        stock={stock}
        combos={combos}
        lastPurchaseCosts={lastPurchaseCosts}
        initialQuote={initialQuote}
      />
'@ `
@'
      <CommercialBudgetOptionalPanelsV45234 />

      <NewSaleForm
        customers={customers}
        locations={locations}
        partners={partners}
        stock={stock}
        combos={combos}
        lastPurchaseCosts={lastPurchaseCosts}
        initialQuote={initialQuote}
      />
'@ `
    "UX opcional do novo orcamento"

  Write-Utf8 $pagePath $page
  Write-Host "Pagina Novo Orcamento preparada." -ForegroundColor Green
} else {
  Write-Host "Pagina Novo Orcamento ja esta em V45.23.4." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 4. NewSaleForm: ordem, estoque junto do produto, busca e validade posterior
# ---------------------------------------------------------------------------

$formPath = "src/components/new-sale-form.tsx"
$form = Read-Utf8 $formPath

if (-not $form.Contains("SaleProductComboboxV45234")) {
  $form = Replace-Once $form `
    'import { CustomerCombobox } from "@/components/customer-combobox";' `
    ('import { CustomerCombobox } from "@/components/customer-combobox";' + "`n" +
     'import { SaleProductComboboxV45234 } from "@/components/sale-product-combobox-v45-23-4";') `
    "import do combobox de produto"

  $form = Replace-Once $form `
@'
      : [
          {
            key: itemKey(),
            productId: "",
            flavorId: "",
            quantity: "1",
            unitPrice: "",
          },
        ],
'@ `
@'
      : [],
'@ `
    "iniciar sem item vazio"

  $form = Replace-Once $form `
@'
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [loadingMode, setLoadingMode] = useState<SaveMode | null>(null);
'@ `
@'
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [quoteFinalizeOpen, setQuoteFinalizeOpen] = useState(false);
  const [loadingMode, setLoadingMode] = useState<SaveMode | null>(null);
'@ `
    "estado da validade do orcamento"

  $form = Replace-Once $form `
@'
  const [flavors, setFlavors] = useState<FlavorOption[]>([]);
  const [flavorStock, setFlavorStock] = useState<FlavorStock[]>([]);

  useEffect(() => {
'@ `
@'
  const [flavors, setFlavors] = useState<FlavorOption[]>([]);
  const [flavorStock, setFlavorStock] = useState<FlavorStock[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAutomaticPartner() {
      if (!customerId) {
        if (!initialQuote) {
          setPartnership(false);
          setPartnerId("");
        }
        return;
      }

      if (
        initialQuote?.customer_id === customerId &&
        initialQuote.partner_id
      ) {
        setPartnership(true);
        setPartnerId(initialQuote.partner_id);
        return;
      }

      try {
        const response = await fetch(
          `/api/customers/${customerId}/relationships?compact=1`,
          { cache: "no-store" },
        );

        if (!response.ok || cancelled) return;

        const payload = (await response.json()) as {
          network?: {
            autoPartner?: {
              partner_id?: string | null;
            } | null;
          };
        };

        if (cancelled) return;

        const automaticPartner =
          payload.network?.autoPartner?.partner_id ?? "";

        if (automaticPartner) {
          setPartnership(true);
          setPartnerId(automaticPartner);
        } else {
          setPartnership(false);
          setPartnerId("");
        }
      } catch {
        if (!cancelled && !initialQuote) {
          setPartnership(false);
          setPartnerId("");
        }
      }
    }

    void loadAutomaticPartner();

    return () => {
      cancelled = true;
    };
  }, [
    customerId,
    initialQuote?.customer_id,
    initialQuote?.partner_id,
  ]);

  useEffect(() => {
'@ `
    "auto atribuicao do parceiro via API"

  $form = Replace-Once $form `
@'
  }, [stock]);

  function rowFor(productId: string) {
'@ `
@'
  }, [stock]);

  const searchableProductOptions = useMemo(() => {
    const location =
      locations.find((row) => row.id === locationId) ?? null;

    return productOptions.map((product) => {
      const localStock = stock.find(
        (row) =>
          row.product_id === product.product_id &&
          row.location_id === locationId,
      );

      return {
        id: product.product_id,
        name: product.product_name,
        category: product.category,
        brand: product.brand,
        available: Number(localStock?.available_quantity ?? 0),
        physical: Number(localStock?.physical_quantity ?? 0),
        locationCode:
          localStock?.location_code ??
          location?.code ??
          "—",
      };
    });
  }, [locationId, locations, productOptions, stock]);

  function rowFor(productId: string) {
'@ `
    "opcoes pesquisaveis por estoque"

  $form = Replace-Once $form `
@'
  function removeItem(key: string) {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter((item) => item.key !== key),
    );
  }
'@ `
@'
  function removeItem(key: string) {
    setItems((current) =>
      current.filter((item) => item.key !== key),
    );
  }
'@ `
    "remover ultimo item"

  $form = Replace-Once $form `
@'
    if (
      items.some(
'@ `
@'
    if (items.length === 0) {
      throw new Error("Adicione pelo menos um produto ao orçamento.");
    }

    if (
      items.some(
'@ `
    "validar pelo menos um produto"

  # Cliente: deixa somente Cliente + Data. Validade vai para depois de Salvar.
  $form = Replace-Once $form `
@'
            <label className="field">
              <span>Validade do orçamento</span>
              <input
                className="input"
                type="date"
                min={quotedOn}
                required
                value={validUntil}
                onChange={(event) =>
                  setValidUntil(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Estoque / depósito de origem</span>
              <select
                className="select"
                required
                value={locationId}
                onChange={(event) =>
                  setLocationId(event.target.value)
                }
              >
                {locations.map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {location.code} · {location.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="field field-span-two">
              <small>
                <strong>Apenas orçando:</strong> não reserva nem
                baixa estoque.{" "}
                <strong>Orçamento confirmado:</strong> cria a
                venda normal; itens ficam reservados até a
                entrega e o brinde é baixado imediatamente.
              </small>
            </div>
'@ `
"" `
    "retirar validade e estoque do primeiro card"

  # Reorganiza topo do card Produtos.
  $form = Replace-Once $form `
@'
          <div className="panel-head">
            <div>
              <h2>Produtos</h2>
              <p>
                Monte a proposta com quantidade, sabor e valor
                negociado de cada item.
              </p>
            </div>

            <button
              className="button ghost compact-button"
              type="button"
              onClick={addItem}
            >
              <Plus size={16} />
              Adicionar produto
            </button>
          </div>

          <div className="panel-body sale-form-items">
            {combos.length > 0 && (
              <div className="budget-combo-picker">
                <Layers3 size={18} />
                <div>
                  <strong>Adicionar combo pronto</strong>
                  <span>
                    Insere os produtos reais do combo e aplica o
                    desconto comercial automaticamente.
                  </span>
                </div>

                <select
                  className="select"
                  value={comboId}
                  onChange={(event) =>
                    setComboId(event.target.value)
                  }
                >
                  <option value="">Selecione um combo</option>
                  {combos.map((combo) => (
                    <option
                      key={combo.id}
                      value={combo.id}
                    >
                      {combo.name} ·{" "}
                      {formatCurrency(combo.sale_price)}
                    </option>
                  ))}
                </select>

                <button
                  className="button ghost compact-button"
                  type="button"
                  disabled={!comboId}
                  onClick={addCombo}
                >
                  <Plus size={15} />
                  Aplicar
                </button>
              </div>
            )}

            {items.map((item, index) => {
'@ `
@'
          <div className="panel-head">
            <div>
              <h2>Produtos</h2>
              <p>
                Primeiro confirme o estoque. Depois pesquise um
                produto pelo nome, marca ou categoria — ou aplique
                um combo pronto.
              </p>
            </div>
          </div>

          <div className="panel-body sale-form-items">
            <div className="v45234-product-setup">
              <label className="field v45234-stock-field">
                <span>Estoque / depósito de origem</span>
                <select
                  className="select"
                  required
                  value={locationId}
                  onChange={(event) =>
                    setLocationId(event.target.value)
                  }
                >
                  {locations.map((location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.code} · {location.name}
                    </option>
                  ))}
                </select>
                <small>
                  CS já vem selecionado por padrão. Troque somente
                  quando a venda sair de outro estoque.
                </small>
              </label>

              <div className="v45234-product-actions">
                <button
                  className="button gold v45234-add-product"
                  type="button"
                  onClick={addItem}
                >
                  <Plus size={17} />
                  Selecionar produto
                </button>

                {combos.length > 0 && (
                  <div className="budget-combo-picker v45234-combo-picker">
                    <Layers3 size={18} />
                    <div>
                      <strong>Selecionar combo</strong>
                      <span>
                        Adiciona os produtos e aplica o desconto
                        comercial automaticamente.
                      </span>
                    </div>

                    <select
                      className="select"
                      value={comboId}
                      onChange={(event) =>
                        setComboId(event.target.value)
                      }
                    >
                      <option value="">Selecione um combo</option>
                      {combos.map((combo) => (
                        <option
                          key={combo.id}
                          value={combo.id}
                        >
                          {combo.name} ·{" "}
                          {formatCurrency(combo.sale_price)}
                        </option>
                      ))}
                    </select>

                    <button
                      className="button ghost compact-button"
                      type="button"
                      disabled={!comboId}
                      onClick={addCombo}
                    >
                      <Plus size={15} />
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {items.length === 0 && (
              <div className="v45234-empty-products">
                <PackagePlus size={20} />
                <div>
                  <strong>Nenhum produto selecionado ainda.</strong>
                  <span>
                    Confirme o estoque acima e toque em
                    Selecionar produto.
                  </span>
                </div>
              </div>
            )}

            {items.map((item, index) => {
'@ `
    "reorganizar produtos e estoque"

  $form = Replace-Once $form `
@'
                    {items.length > 1 && (
'@ `
@'
                    {items.length > 0 && (
'@ `
    "permitir remover ultimo produto"

  $form = Replace-Once $form `
@'
                    <label className="field sale-product-field">
                      <span>Produto</span>
                      <select
                        className="select"
                        required
                        value={item.productId}
                        onChange={(event) =>
                          selectProduct(
                            item.key,
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Selecione o produto
                        </option>
                        {productOptions.map((product) => (
                          <option
                            key={product.product_id}
                            value={product.product_id}
                          >
                            {product.product_name}
                          </option>
                        ))}
                      </select>
                    </label>
'@ `
@'
                    <label className="field sale-product-field">
                      <span>Produto</span>
                      <SaleProductComboboxV45234
                        options={searchableProductOptions}
                        value={item.productId}
                        onChange={(productId) =>
                          selectProduct(
                            item.key,
                            productId,
                          )
                        }
                      />
                      <small>
                        Produtos com saldo neste estoque aparecem
                        em verde. Sem estoque continua selecionável.
                      </small>
                    </label>
'@ `
    "trocar select por busca digitavel"

  # Volta para Comercial no orçamento simples e usa URL canonica na venda.
  $form = Replace-Once $form `
@'
      const leadId = saved?.lead_id
        ? String(saved.lead_id)
        : null;

'@ `
"" `
    "retirar target de lead antigo"

  $form = Replace-Once $form `
@'
      setChoiceOpen(false);

      setSavedBudgetPrompt({
        quoteId,
        target: saleId
          ? `/vendas/${saleId}`
          : leadId
            ? `/leads/${leadId}`
            : "/leads",
        mode,
      });
'@ `
@'
      setChoiceOpen(false);
      setQuoteFinalizeOpen(false);

      setSavedBudgetPrompt({
        quoteId,
        target: saleId
          ? `/suplementos/vendas/${saleId}`
          : "/suplementos/vendas",
        mode,
      });
'@ `
    "destino apos salvar"

  $form = Replace-Once $form `
@'
      setChoiceOpen(false);
    } finally {
'@ `
@'
      setChoiceOpen(false);
      setQuoteFinalizeOpen(false);
    } finally {
'@ `
    "fechar modal de validade em erro"

  $form = Replace-Once $form `
@'
                onClick={() =>
                  persist("quote")
                }
'@ `
@'
                onClick={() => {
                  setChoiceOpen(false);
                  setQuoteFinalizeOpen(true);
                }}
'@ `
    "abrir validade somente no apenas orcando"

  # Insere etapa de validade antes do prompt de PDF.
  $anchor = @'
      {savedBudgetPrompt && (
'@

  $quoteFinalize = @'
      {quoteFinalizeOpen && (
        <div
          className="budget-choice-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loadingMode
            ) {
              setQuoteFinalizeOpen(false);
              setChoiceOpen(true);
            }
          }}
        >
          <section
            className="budget-choice-modal v45234-quote-finalize"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v45234-quote-validity-title"
          >
            <button
              className="budget-choice-close"
              type="button"
              aria-label="Voltar"
              disabled={Boolean(loadingMode)}
              onClick={() => {
                setQuoteFinalizeOpen(false);
                setChoiceOpen(true);
              }}
            >
              <X size={18} />
            </button>

            <div className="budget-choice-heading">
              <FileText size={25} />
              <div>
                <span>Apenas orçamento</span>
                <h2 id="v45234-quote-validity-title">
                  Até quando essa proposta vale?
                </h2>
                <p>
                  A validade só é necessária quando ainda é uma
                  proposta. Ela não aparece na venda confirmada.
                </p>
              </div>
            </div>

            <label className="field v45234-validity-field">
              <span>Validade do orçamento</span>
              <input
                className="input"
                type="date"
                min={quotedOn}
                required
                value={validUntil}
                onChange={(event) =>
                  setValidUntil(event.target.value)
                }
              />
            </label>

            <div className="v45234-quote-finalize-actions">
              <button
                className="button ghost"
                type="button"
                disabled={Boolean(loadingMode)}
                onClick={() => {
                  setQuoteFinalizeOpen(false);
                  setChoiceOpen(true);
                }}
              >
                Voltar
              </button>

              <button
                className="button gold"
                type="button"
                disabled={Boolean(loadingMode)}
                onClick={() => persist("quote")}
              >
                {loadingMode === "quote" ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <Save size={17} />
                )}
                {loadingMode === "quote"
                  ? "Salvando"
                  : "Salvar orçamento"}
              </button>
            </div>
          </section>
        </div>
      )}

'@

  if (-not $form.Contains($quoteFinalize.Trim())) {
    $form = Replace-Once $form $anchor ($quoteFinalize + $anchor) "modal de validade"
  }

  # Cancelar tambem volta para a rota canonica.
  $form = $form.Replace(
    '<Link className="button ghost" href="/vendas">',
    '<Link className="button ghost" href="/suplementos/vendas">'
  )

  Write-Utf8 $formPath $form
  Write-Host "Fluxo do Novo Orcamento reorganizado." -ForegroundColor Green
} else {
  Write-Host "NewSaleForm V45.23.4 ja aplicado." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 5. Restaura a etapa Confirmado nas URLs canonicas e mantem PDF depois
# ---------------------------------------------------------------------------

$flowPath = "src/components/budget-confirmed-flow-ux.tsx"
$flow = Read-Utf8 $flowPath

if (-not $flow.Contains('pathname === "/suplementos/vendas/nova"')) {
  $flow = $flow.Replace(
    'if (pathname !== "/vendas/nova") return;',
    'if (pathname !== "/vendas/nova" && pathname !== "/suplementos/vendas/nova") return;'
  )

  $flow = $flow.Replace(
    'if (pathname !== "/vendas/nova" || !open) {',
    'if ((pathname !== "/vendas/nova" && pathname !== "/suplementos/vendas/nova") || !open) {'
  )

  # A V45.15 pulava o PDF depois do confirmado. Agora preservamos o prompt
  # nos dois caminhos, como solicitado no pente-fino.
  $flow = $flow.Replace(
    "    skipConfirmedPdfRef.current = true;`n",
    ""
  )

  Write-Utf8 $flowPath $flow
  Write-Host "Fluxo confirmado restaurado em /suplementos/vendas/nova." -ForegroundColor Green
} else {
  Write-Host "BudgetConfirmedFlow ja reconhece a URL canonica." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 6. CSS do pente-fino comercial
# ---------------------------------------------------------------------------

$cssPath = "src/app/v45-15-commercial-flow.css"
$css = Read-Utf8 $cssPath
$marker = "V45.23.4 · Pente-fino do Novo Orcamento"

if (-not $css.Contains($marker)) {
  $cssPatch = @'

/* =========================================================
   V45.23.4 · Pente-fino do Novo Orcamento
   ========================================================= */

.v45234-product-setup {
  display: grid;
  gap: 12px;
}

.v45234-stock-field {
  width: min(520px, 100%);
}

.v45234-product-actions {
  display: grid;
  grid-template-columns: minmax(190px, .65fr) minmax(0, 1.35fr);
  gap: 10px;
  align-items: stretch;
}

.v45234-add-product {
  min-height: 82px;
  justify-content: center;
  font-weight: 900;
}

.v45234-combo-picker {
  margin: 0 !important;
  min-width: 0;
}

.v45234-empty-products {
  min-height: 82px;
  padding: 16px;
  border: 1px dashed rgba(217, 166, 61, .18);
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--muted);
  background: rgba(217, 166, 61, .02);
}

.v45234-empty-products strong,
.v45234-empty-products span {
  display: block;
}

.v45234-empty-products strong {
  color: var(--text);
  font-size: 12px;
}

.v45234-empty-products span {
  margin-top: 3px;
  font-size: 10px;
}

/* Busca digitável de produtos */
.sale-product-combobox-v45234 {
  position: relative;
  width: 100%;
  min-width: 0;
  z-index: 20;
}

.sale-product-combobox-input-v45234 {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-inline: 11px;
  background: rgba(255,255,255,.012);
}

.sale-product-combobox-input-v45234.open {
  border-color: rgba(217,166,61,.42);
  box-shadow: 0 0 0 3px rgba(217,166,61,.06);
}

.sale-product-combobox-input-v45234 > svg {
  flex: 0 0 auto;
  color: var(--muted);
}

.sale-product-combobox-input-v45234 .input {
  min-width: 0;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding-inline: 0 !important;
}

.sale-product-combobox-menu-v45234 {
  position: absolute;
  z-index: 140;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 340px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 13px;
  overflow-y: auto;
  background: rgba(9, 12, 18, .985);
  box-shadow: 0 22px 60px rgba(0,0,0,.48);
}

.sale-product-combobox-menu-v45234 button {
  width: 100%;
  min-width: 0;
  min-height: 54px;
  padding: 8px 9px;
  border: 0;
  border-radius: 9px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 9px;
  color: var(--text);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.sale-product-combobox-menu-v45234 button:hover,
.sale-product-combobox-menu-v45234 button.active {
  background: rgba(255,255,255,.045);
}

.sale-product-combobox-menu-v45234 button.has-stock > svg,
.sale-product-combobox-menu-v45234 button.has-stock strong,
.sale-product-combobox-menu-v45234 button.has-stock em {
  color: #51d89a;
}

.sale-product-combobox-menu-v45234 button.no-stock {
  opacity: .68;
}

.sale-product-combobox-menu-v45234 strong,
.sale-product-combobox-menu-v45234 small {
  display: block;
}

.sale-product-combobox-menu-v45234 strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.sale-product-combobox-menu-v45234 small {
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
}

.sale-product-combobox-menu-v45234 em {
  color: var(--muted);
  font-size: 8px;
  font-style: normal;
  font-weight: 900;
  white-space: nowrap;
}

.sale-product-combobox-empty-v45234 {
  padding: 16px 12px;
  color: var(--muted);
  font-size: 10px;
  text-align: center;
}

/* Ajustes e observações ficam recolhidos até serem necessários. */
.v45234-optional-panel .panel-head {
  align-items: center;
}

.v45234-optional-panel:not(.is-open) .panel-body {
  display: none !important;
}

.v45234-optional-toggle {
  min-width: 190px;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text);
  background: rgba(255,255,255,.012);
  cursor: pointer;
}

.v45234-optional-toggle span:first-child {
  min-width: 0;
  text-align: left;
}

.v45234-optional-toggle b,
.v45234-optional-toggle small {
  display: block;
}

.v45234-optional-toggle b {
  color: var(--gold);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.v45234-optional-toggle small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 8px;
}

.v45234-optional-toggle [data-state] {
  color: var(--gold);
  font-size: 9px;
  font-weight: 900;
}

/* Validade existe somente no caminho "Apenas orçamento". */
.v45234-quote-finalize {
  max-width: 560px;
}

.v45234-validity-field {
  margin-top: 18px;
}

.v45234-quote-finalize-actions {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 8px;
}

/* Parceria com a mesma força visual dos demais controles da confirmação. */
.v4515-confirm-flow-open
  .new-sale-side
  > article[data-v4515-stage="partnership"] {
  opacity: 1 !important;
}

.v4515-confirm-flow-open
  .new-sale-side
  .choice-card {
  min-height: 72px;
}

@media (max-width: 720px) {
  .v45234-product-actions {
    grid-template-columns: 1fr;
  }

  .v45234-add-product {
    min-height: 58px;
  }

  .sale-product-combobox-menu-v45234 {
    position: fixed;
    z-index: 1500;
    top: 18dvh;
    left: 12px;
    right: 12px;
    max-height: 58dvh;
  }

  .sale-product-combobox-menu-v45234 button {
    min-height: 58px;
  }

  .v45234-optional-panel .panel-head {
    display: grid;
    grid-template-columns: 1fr;
  }

  .v45234-optional-toggle {
    width: 100%;
    min-width: 0;
  }

  .v45234-quote-finalize-actions {
    grid-template-columns: 1fr;
  }
}
'@

  $css = $css.TrimEnd() + "`n" + $cssPatch.TrimStart() + "`n"
  Write-Utf8 $cssPath $css
  Write-Host "CSS do novo fluxo comercial aplicado." -ForegroundColor Green
} else {
  Write-Host "CSS V45.23.4 ja aplicado." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 7. Cache e validacoes
# ---------------------------------------------------------------------------

if (Test-Path -LiteralPath ".next") {
  Remove-Item -LiteralPath ".next" -Recurse -Force
  Write-Host "Cache .next removido." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Validando TypeScript..." -ForegroundColor Cyan
& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
  Fail "TypeScript encontrou erro. NAO faca commit. Mande um print desta janela."
}
Write-Host "TypeScript OK." -ForegroundColor Green

Write-Host ""
Write-Host "Validando diff..." -ForegroundColor Cyan
& git diff --check
if ($LASTEXITCODE -ne 0) {
  Fail "git diff --check encontrou erro. NAO faca commit."
}
Write-Host "git diff --check OK." -ForegroundColor Green

Write-Host ""
Write-Host "V45.23.4 R2 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.23.4 - restaura e reorganiza fluxo comercial" -ForegroundColor White
Write-Host ""
