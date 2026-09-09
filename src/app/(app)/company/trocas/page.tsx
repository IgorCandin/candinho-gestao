import ReturnsCenterPage from "../../trocas/page";

export default function CompanyReturnsPage(props: Parameters<typeof ReturnsCenterPage>[0]) {
  return <ReturnsCenterPage {...props} companyMode />;
}
