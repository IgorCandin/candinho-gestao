"use client";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
export function SortableHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void; }) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return <button className={`sortable-header ${active ? "active" : ""}`} type="button" onClick={onClick}><span>{label}</span><Icon size={14} aria-hidden="true" /></button>;
}
