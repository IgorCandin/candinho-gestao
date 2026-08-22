import type { ReactNode } from "react";
import "./physique-ux.css";
import "./physique-muscle-insights-v45-40.css";

export default function PhysiqueLayout({ children }: { children: ReactNode }) {
  return (
    <main className="physique-standalone-shell">
      <div className="physique-standalone-container">{children}</div>
    </main>
  );
}
