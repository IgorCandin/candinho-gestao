"use client";

import Link from "next/link";
import { ArrowRightLeft, ClipboardCheck, PackageSearch, RefreshCcw, ScanLine, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

type FitnessItem = { id: string; name: string; size: string; color: string; physical: number; available: number };

export function CompanyStockHub({ fitness, initialOperation = "supplements" }: { fitness: FitnessItem[]; initialOperation?: "supplements" | "fitness" }) {
  const [operation, setOperation] = useState<"supplements" | "fitness">(initialOperation);
  const [query, setQuery] = useState("");
  const visibleFitness = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return !needle ? fitness : fitness.filter((item) => `${item.name} ${item.size} ${item.color}`.toLocaleLowerCase("pt-BR").includes(needle));
  }, [fitness, query]);
  const cards = operation === "supplements" ? [
    ["Estoque", "Saldos, locais, sabores e histórico.", "/estoque", PackageSearch],
    ["Contagem física", "Confirme o que existe de verdade em cada local.", "/estoque/reconciliacao/contagem", ClipboardCheck],
    ["Transferir", "Leve um ou vários produtos entre locais.", "/company/produtos/transferencias?operacao=supplements", ArrowRightLeft],
    ["Correção", "Ajuste de saldo com motivo e histórico.", "/estoque", Settings2],
    ["Reconciliação", "Revise divergências sem apagar auditoria.", "/estoque/reconciliacao", RefreshCcw],
  ] as const : [
    ["Estoque", "Peças, tamanhos, cores e disponibilidade.", "/fitness/estoque", PackageSearch],
    ["Contagem física", "Conferência por variação; registra as diferenças.", "/fitness/estoque/conferencia", ClipboardCheck],
    ["Correção", "Ajuste individual de uma peça com motivo auditável.", "#ajuste-fitness", Settings2],
    ["Reconciliação", "A conferência física é a reconciliação oficial do Fitness.", "/fitness/estoque/conferencia", RefreshCcw],
  ] as const;
  return <div className="company-workspace-v2 company-stock-hub">
    <header className="company-workspace-head"><div><span>COMPANY · ESTOQUE</span><h1>Qual operação você quer movimentar?</h1><p>Contagem, correção e reconciliação respeitam a operação escolhida. Nada de abrir uma rotina de Suplementos para acertar uma peça Fitness.</p></div></header>
    <div className="company-quote-operation-tabs"><button type="button" className={operation === "supplements" ? "active" : ""} onClick={() => setOperation("supplements")}>Suplementos</button><button type="button" className={operation === "fitness" ? "active" : ""} onClick={() => setOperation("fitness")}>Fitness</button></div>
    <section className="company-stock-action-grid">{cards.map(([title, note, href, Icon]) => <Link key={title} href={href}><Icon size={20}/><span><strong>{title}</strong><small>{note}</small></span></Link>)}</section>
    {operation === "fitness" ? <section id="ajuste-fitness" className="panel company-stock-fitness-adjust"><div className="panel-head"><div><h2>Corrigir uma peça Fitness</h2><p>Encontre a variação e abra o ajuste. Exemplo: a blusa de tule branca que veio com defeito.</p></div><ScanLine size={20}/></div><div className="panel-body"><label className="field"><span>Buscar peça, tamanho ou cor</span><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: blusa tule branca"/></label><div className="table-wrap"><table><thead><tr><th>Peça</th><th>Variação</th><th>Físico</th><th>Disponível</th><th></th></tr></thead><tbody>{visibleFitness.slice(0,80).map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.size} · {item.color}</td><td>{item.physical}</td><td>{item.available}</td><td><Link className="button ghost compact" href={`/company/estoque/fitness/${item.id}`}>Ajustar</Link></td></tr>)}{visibleFitness.length === 0 ? <tr><td colSpan={5}>Nenhuma peça encontrada.</td></tr> : null}</tbody></table></div></div></section> : null}
    {operation === "fitness" ? <p className="form-help">Transferência entre depósitos só aparece quando o Fitness tiver pelo menos dois locais físicos cadastrados. Hoje o controle de Fitness é por variação (tamanho e cor), portanto uma “transferência” sem origem e destino seria apenas um ajuste disfarçado.</p> : null}
  </div>;
}
