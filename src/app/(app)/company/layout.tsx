import { CompanyOperationalSurface } from "@/components/company-operational-surface";
export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <CompanyOperationalSurface>{children}</CompanyOperationalSurface>;
}
