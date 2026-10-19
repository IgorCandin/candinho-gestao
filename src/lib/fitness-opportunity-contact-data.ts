import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { FitnessContactState } from "./fitness-opportunity-contact";
export async function getFitnessOpportunityContacts():Promise<FitnessContactState[]>{
 const access=await getCurrentUserAccess();if(!access.active||access.role==="partner"||(access.role!=="admin"&&!access.canAccessFitness))return [];
 const db=await createClient();const rows:FitnessContactState[]=[];
 for(let from=0;;from+=500){const {data,error}=await db.from("fitness_opportunity_contact_state").select("customer_id,status,next_contact_on,notes,revision,updated_at").order("customer_id").range(from,from+499);if(error)throw error;rows.push(...(data??[]) as FitnessContactState[]);if(!data||data.length<500)return rows}
}
