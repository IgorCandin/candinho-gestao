import { PartnerDetailsPage } from "../../../parceiros/[id]/page";

export default function CompanyPartnerDetailsPage({params}:{params:Promise<{id:string}>}){return <PartnerDetailsPage params={params} companyMode/>;}
