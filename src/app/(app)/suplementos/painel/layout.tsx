import { ManagerialStockHealthPanel } from "@/components/managerial-stock-health-panel";
import { getInventoryOverview } from "@/lib/data";

export default async function SupplementsManagerialPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const inventory = await getInventoryOverview();

  return (
    <>
      {children}

      <section className="managerial-products-stock-section">
        <div className="managerial-products-stock-heading">
          <span>Produtos · gestão de estoque</span>
          <h2>Reposição por curva comercial</h2>
          <p>
            A = acompanhamento preventivo; B = repor quando zerar; C = sob
            encomenda; Z = alternativo, descontinuado ou fora da vitrine.
          </p>
        </div>

        <ManagerialStockHealthPanel products={inventory} />
      </section>
    </>
  );
}
