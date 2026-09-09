import ReturnCaseDetailPage from "../../../trocas/[id]/page";

export default function CompanyReturnCaseDetailPage(props: Parameters<typeof ReturnCaseDetailPage>[0]) {
  return <ReturnCaseDetailPage {...props} companyMode />;
}
