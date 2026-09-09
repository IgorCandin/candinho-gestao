import HistoricalFlavorPage from "../../../../produtos/sabores/historico/page";

export default function CompanyHistoricalFlavorPage(props: Parameters<typeof HistoricalFlavorPage>[0]) {
  return <HistoricalFlavorPage {...props} companyMode />;
}
