"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./company-entry-portal.css";

export function CompanyEntryPortal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("company-entry-seen") === "brand-cc-v2") return;
    sessionStorage.setItem("company-entry-seen", "brand-cc-v2");
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
    <div className="company-entry-mark"><Image className="company-entry-logo" src="/company-entry-cc.png" alt="Candinho Company" width={160} height={160} priority unoptimized/><strong>CANDINHO</strong><small>COMPANY</small></div>
  </div>;
}
