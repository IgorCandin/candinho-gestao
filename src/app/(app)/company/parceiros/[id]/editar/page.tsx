import EditPartnerPage from "../../../../parceiros/[id]/editar/page";

export default function CompanyEditPartnerPage({params}:{params:Promise<{id:string}>}){return <EditPartnerPage params={params} companyMode/>;}
