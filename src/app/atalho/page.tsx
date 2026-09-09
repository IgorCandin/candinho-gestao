"use client";

import { useEffect } from "react";

export default function InstalledShortcutPage() {
  useEffect(() => {
    const cookieTarget = document.cookie
      .split("; ")
      .find((item) => item.startsWith("candinho_app_start_url="))
      ?.split("=")
      .slice(1)
      .join("=");
    const target = cookieTarget
      ? decodeURIComponent(cookieTarget)
      : window.localStorage.getItem("candinho:app-start-url");
    window.location.replace(target?.startsWith("/") ? target : "/dashboard");
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeContent: "center",
        gap: 8,
        textAlign: "center",
        background: "#070a0f",
        color: "#f5f7fa",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <strong>Abrindo sua ficha…</strong>
      <span style={{ color: "#95a0b2" }}>Candinho Company</span>
    </main>
  );
}
