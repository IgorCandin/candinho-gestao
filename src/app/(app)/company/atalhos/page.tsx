import { redirect } from "next/navigation";
import { ShortcutManagement } from "@/components/company-shortcuts";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyShortcutsPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  return <div className="company-workspace-v2"><ShortcutManagement/></div>;
}
