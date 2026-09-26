"use client";

import { useEffect, useState } from "react";

export function CompanyEntryPortal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("company-entry-seen") === "1") return;
    sessionStorage.setItem("company-entry-seen", "1");
    const showTimer = window.setTimeout(() => setVisible(true), 0);
    const timer = window.setTimeout(() => setVisible(false), 1250);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;
  return <div className="company-entry-portal" role="status" aria-label="Entrando na Candinho Company">
    <button type="button" onClick={() => setVisible(false)}>Pular</button>
    <div className="company-entry-mark"><span>CC</span><strong>CANDINHO</strong><small>COMPANY</small></div>
  </div>;
}
