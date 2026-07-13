import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: LucideIcon }) {
  return (
    <article className="stat-card">
      <div className="stat-head"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}
