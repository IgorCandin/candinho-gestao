import { StockCostsSubnav } from "@/components/stock-costs-subnav";

export default function SupplementsStockLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StockCostsSubnav operation="supplements" />
      {children}
    </>
  );
}
