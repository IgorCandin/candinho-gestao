import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyNexusUxIssuesPage() {
  redirect("/nexus/qualidade");
}
