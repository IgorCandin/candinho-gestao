import type { ReactNode } from "react";
import "./physique-ux.css";

export default function PhysiqueLayout({ children }: { children: ReactNode }) {
  return (
    <main className="physique-standalone-shell">
      <div className="physique-standalone-container">{children}</div>
    </main>
  );
}
