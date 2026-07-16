import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, note, icon: Icon, href }: { label: string; value: string; note: string; icon: LucideIcon; href?: string }) {
  const content = <>
    <div className="stat-head"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div>
    <div className="stat-value">{value}</div>
    <div className="stat-note">{note}</div>
  </>;
  if (href) return <Link className="stat-card stat-card-link" href={href} aria-label={`${label}: ${value}`}>{content}</Link>;
  return <article className="stat-card">{content}</article>;
}
