import { StockCostsSubnav } from "@/components/stock-costs-subnav";

export default function FitnessStockLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StockCostsSubnav operation="fitness" />
      {children}
    </>
  );
}
