import { revalidatePath } from "next/cache";
import { companyDestination } from "./company-destination";

export function revalidateCentralPath(path:string){
  revalidatePath(path);
  const companyPath=companyDestination(path);
  if(companyPath!==path) revalidatePath(companyPath);
}
