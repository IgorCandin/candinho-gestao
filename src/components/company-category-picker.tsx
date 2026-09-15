"use client";
import { useState } from "react";

export function CompanyCategoryPicker({ categories, value, onChange }: { categories: string[]; value: string; onChange: (value: string) => void }) {
  const choices = [...new Set(categories.map((category) => category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const [adding, setAdding] = useState(() => Boolean(value && !choices.includes(value)));
  return <label className="field"><span>Categoria</span><select className="select" value={adding ? "__add__" : value} onChange={(event) => { const add = event.target.value === "__add__"; setAdding(add); onChange(add ? "" : event.target.value); }}><option value="">Selecione uma categoria</option>{choices.map((category) => <option key={category} value={category}>{category}</option>)}<option value="__add__">Adicionar categoria...</option></select>{adding ? <input className="input" autoFocus aria-label="Nome da nova categoria" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Escreva a categoria"/> : null}</label>;
}
