export type FitnessContactStatus = "contacted" | "responded" | "later";
export type FitnessContactState = { customer_id:string;status:FitnessContactStatus;next_contact_on:string|null;notes:string|null;revision:number;updated_at:string };
export function fitnessContactDue(contact:FitnessContactState|undefined,today:string){return !contact || Boolean(contact.next_contact_on && contact.next_contact_on<=today)}
export function fitnessContactLabel(contact:FitnessContactState){return contact.status==="contacted"?"Já chamei · aguardando resposta":contact.status==="responded"?"Respondeu · em atendimento":"Ficou para depois"}
export function mergeFitnessContacts(initial:FitnessContactState[],updates:Record<string,FitnessContactState>){const map=Object.fromEntries(initial.map(row=>[row.customer_id,row]));for(const row of Object.values(updates))if(!map[row.customer_id]||row.revision>=map[row.customer_id].revision)map[row.customer_id]=row;return map}
