"use client";
import "./fitness-opportunity-contact-actions.css";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { notifyCompanyWorkflowUpdated } from "@/components/company-workflow-sync";
import { fitnessContactLabel, type FitnessContactState, type FitnessContactStatus } from "@/lib/fitness-opportunity-contact";
import { formatDateOnly } from "@/lib/format";
export function FitnessOpportunityContactActions({customerId,contact,canWrite,today,onSaved}:{customerId:string;contact?:FitnessContactState;canWrite:boolean;today:string;onSaved:(contact:FitnessContactState)=>void}){
 const router=useRouter();const [later,setLater]=useState(false),[nextDate,setNextDate]=useState(""),[notes,setNotes]=useState(contact?.notes??""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function save(status:FitnessContactStatus){if(busy)return;if(status==="later"&&(!nextDate||nextDate<=today)){setError("Escolha uma data futura para retornar.");return}setBusy(true);setError("");try{const response=await fetch(`/api/company/fitness/customers/${customerId}/opportunity-contact`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,expectedRevision:contact?.revision??0,nextContactOn:status==="later"?nextDate:null,notes:notes.trim()||null})});const result=await response.json();if(!response.ok||!result.contact)throw new Error(result.error||"Não foi possível registrar o contato.");onSaved(result.contact);setLater(false);notifyCompanyWorkflowUpdated();router.refresh()}catch(error){setError(error instanceof Error?error.message:"Não foi possível salvar.");router.refresh()}finally{setBusy(false)}}
 return <section className="fitness-contact-console" aria-label="Registro do contato Fitness">
  <strong>{contact?fitnessContactLabel(contact,today):"Cliente ainda não chamada nesta fila"}</strong>
  {contact&&<><small>Último registro: {new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(contact.updated_at))}{contact.next_contact_on?` · Retorno: ${formatDateOnly(contact.next_contact_on)}`:""}</small>{contact.notes&&<p>{contact.notes}</p>}</>}
  {canWrite&&<><p>O registro vale para todas as oportunidades desta cliente. Abrir WhatsApp ou preparar venda não marca contato automaticamente.</p><label>Observação do atendimento<textarea maxLength={1000} value={notes} onChange={event=>setNotes(event.target.value)} disabled={busy}/></label><div className="fitness-contact-buttons"><button type="button" disabled={busy} onClick={()=>void save("contacted")}>Já chamei · aguardar resposta</button><button type="button" disabled={busy} onClick={()=>void save("responded")}>Respondeu · em atendimento</button><button type="button" disabled={busy} aria-expanded={later} onClick={()=>{setLater(!later);setError("")}}>Ficou para depois</button></div><small>“Já chamei” tira a cliente das oportunidades novas por 6 dias. Você pode registrar a resposta antes disso em Contatos registrados.</small>{later&&<div className="fitness-contact-schedule"><label>Voltar a falar em<input type="date" value={nextDate} min={new Date(Date.parse(today+"T12:00:00Z")+86400000).toISOString().slice(0,10)} onChange={event=>setNextDate(event.target.value)} disabled={busy}/></label><button type="button" disabled={busy||!nextDate} onClick={()=>void save("later")}>Salvar retorno combinado</button></div>}{busy&&<p role="status">Salvando contato…</p>}</>}
  <Link href="/company/acompanhar?operacao=Fitness&fila=all">Ver contatos e retornos no Acompanhar</Link>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
