import { BankV39Shell } from "@/components/bank-v39-shell";

export default function BankLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BankV39Shell />
      {children}
    </>
  );
}
