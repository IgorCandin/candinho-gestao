import type { ReactNode } from "react";

export default function PhysiqueLayout({ children }: { children: ReactNode }) {
  return <main className="physique-standalone-shell"><div className="physique-standalone-container">{children}</div></main>;
}
