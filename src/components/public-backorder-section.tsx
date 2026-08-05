"use client";

import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  PackageSearch,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { PublicBackorderProduct } from "@/lib/public-backorder-data";
import styles from "./public-backorder-section.module.css";

type ApiResponse = {
  ok?: boolean;
  available_now?: boolean;
  matched_name?: string | null;
  message?: string;
  error?: string;
};

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function PublicBackorderSection({
  products,
}: {
  products: PublicBackorderProduct[];
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] =
    useState<PublicBackorderProduct | null>(null);

  const filtered = useMemo(() => {
    const term = normalized(query.trim());

    const rows = term
      ? products.filter((item) =>
          normalized(
            [item.name, item.category, item.brand]
              .filter(Boolean)
              .join(" "),
          ).includes(term),
        )
      : products;

    return expanded ? rows : rows.slice(0, 12);
  }, [expanded, products, query]);

  if (products.length === 0) return null;

  return (
    <section className={styles.section} id="sob-encomenda">
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <PackageSearch size={16} />
          SOB ENCOMENDA
        </div>
        <h2>Não tem estoque agora? Ainda dá para pedir.</h2>
        <p>
          Estes suplementos fazem parte do nosso mix, mas estão
          zerados no momento. Demonstre interesse e a procura entra
          automaticamente no nosso painel de reposição.
        </p>
      </header>

      <div className={styles.search}>
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setExpanded(true);
          }}
          placeholder="Buscar entre os produtos sob encomenda..."
        />
      </div>

      <div className={styles.grid}>
        {filtered.map((item) => (
          <article className={styles.card} key={item.product_id}>
            <div className={styles.image}>
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.name} />
              ) : (
                <PackageSearch size={30} />
              )}
            </div>

            <div className={styles.copy}>
              <small>{item.category ?? "Suplementos"}</small>
              <strong>{item.name}</strong>
              {item.brand && <span>{item.brand}</span>}

              <em>
                {item.incoming_quantity > 0 ? (
                  <>
                    <Clock3 size={14} />
                    Reposição a caminho
                  </>
                ) : (
                  <>
                    <PackageSearch size={14} />
                    Sob encomenda
                  </>
                )}
              </em>
            </div>

            <button
              className={styles.action}
              type="button"
              onClick={() => setSelected(item)}
            >
              Tenho interesse
            </button>
          </article>
        ))}
      </div>

      {!query.trim() && products.length > 12 && (
        <button
          className={styles.more}
          type="button"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded
            ? "Mostrar menos"
            : `Ver todos os ${products.length} produtos`}
        </button>
      )}

      <CustomDemandForm />

      {selected && (
        <KnownDemandForm
          product={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function KnownDemandForm({
  product,
  onClose,
}: {
  product: PublicBackorderProduct;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/catalogo/ruptura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          product_id: product.product_id,
          product_name: product.name,
          source: "catalog_backorder",
        }),
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error || "Não foi possível registrar o interesse.",
        );
      }

      setResult(
        payload.message ||
          "Pronto. Seu interesse entrou na nossa lista de reposição.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar o interesse.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <button
          className={styles.close}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {result ? (
          <div className={styles.success}>
            <CheckCircle2 size={30} />
            <h3>Interesse registrado</h3>
            <p>{result}</p>
            <button className={styles.action} type="button" onClick={onClose}>
              Fechar
            </button>
          </div>
        ) : (
          <>
            <span className={styles.modalEyebrow}>SOB ENCOMENDA</span>
            <h3>{product.name}</h3>
            <p>
              Deixe seu contato. Essa procura vai para a Central da
              Candinho e ajuda a decidir a próxima reposição.
            </p>

            <form className={styles.form} onSubmit={submit}>
              <label>
                <span>Seu nome</span>
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome"
                />
              </label>

              <label>
                <span>WhatsApp / telefone</span>
                <input
                  required
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </label>

              <button
                className={styles.action}
                type="submit"
                disabled={sending}
              >
                {sending ? (
                  <LoaderCircle className={styles.spin} size={17} />
                ) : (
                  <Send size={17} />
                )}
                {sending ? "Enviando..." : "Quero que a Candinho reponha"}
              </button>

              {error && <span className={styles.error}>{error}</span>}
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function CustomDemandForm() {
  const [productName, setProductName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/catalogo/ruptura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          product_name: productName,
          source: "catalog_missing_search",
          use_nexus: true,
        }),
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error || "Não foi possível registrar a procura.",
        );
      }

      setResult(
        payload.message ||
          "Pronto. A procura entrou no painel da Candinho.",
      );

      if (!payload.available_now) {
        setProductName("");
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar a procura.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <article className={styles.custom}>
      <div className={styles.customHead}>
        <Sparkles size={21} />
        <div>
          <strong>Não encontrou o produto que procura?</strong>
          <span>
            Digite como você conhece o produto. O Nexus tenta identificar
            o item e registra a procura na Central.
          </span>
        </div>
      </div>

      <form className={styles.customForm} onSubmit={submit}>
        <label className={styles.productField}>
          <span>Produto que você procura</span>
          <input
            required
            minLength={2}
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="Ex.: Whey Integralmedica de morango"
          />
        </label>

        <label>
          <span>Seu nome</span>
          <input
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
          />
        </label>

        <label>
          <span>WhatsApp</span>
          <input
            required
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(00) 00000-0000"
          />
        </label>

        <button className={styles.action} type="submit" disabled={sending}>
          {sending ? (
            <LoaderCircle className={styles.spin} size={17} />
          ) : (
            <Send size={17} />
          )}
          {sending ? "Identificando..." : "Enviar procura"}
        </button>
      </form>

      {result && (
        <div className={styles.inlineSuccess}>
          <CheckCircle2 size={17} />
          {result}
        </div>
      )}
      {error && <span className={styles.error}>{error}</span>}
    </article>
  );
}
