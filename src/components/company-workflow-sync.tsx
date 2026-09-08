"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const COMPANY_WORKFLOW_SYNC_KEY = "company-workflow-updated-at";

export function notifyCompanyWorkflowUpdated() {
  window.localStorage.setItem(COMPANY_WORKFLOW_SYNC_KEY, String(Date.now()));
}

export function CompanyWorkflowSync() {
  const router = useRouter();
  useEffect(() => {
    const refresh = (event?: StorageEvent) => { if (!event || event.key === COMPANY_WORKFLOW_SYNC_KEY) router.refresh(); };
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("storage", refresh); document.removeEventListener("visibilitychange", onVisibility); };
  }, [router]);
  return null;
}
