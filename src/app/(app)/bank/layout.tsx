import { BankV39Shell } from "@/components/bank-v39-shell";

export default function BankLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BankV39Shell />
      {children}
      <style>{`
        .bank-v39-mobile-nav { display: none; }

        @media (max-width: 900px) {
          .bank-v39-mobile-nav {
            position: fixed;
            z-index: 80;
            left: 10px;
            right: 10px;
            bottom: max(10px, env(safe-area-inset-bottom));
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 5px;
            padding: 6px;
            border: 1px solid var(--border);
            border-radius: 18px;
            background: color-mix(in srgb, var(--panel) 94%, transparent);
            box-shadow: 0 14px 40px rgba(0,0,0,.22);
            backdrop-filter: blur(16px);
          }

          .bank-v39-mobile-nav a {
            min-width: 0;
            min-height: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            border-radius: 12px;
            color: var(--muted);
            text-decoration: none;
            font-size: 10px;
            font-weight: 700;
          }

          .bank-v39-mobile-nav a.active {
            color: var(--text);
            background: color-mix(in srgb, var(--gold) 16%, transparent);
          }

          .content { padding-bottom: 88px; }
        }
      `}</style>
    </>
  );
}
