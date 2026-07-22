"use client";

import { Camera, CheckCircle2, FileSearch, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Draft = {
  assessed_on:string; weight_kg:string; height_cm:string; body_fat_pct:string; chest_cm:string;
  waist_cm:string; abdomen_cm:string; hips_cm:string; arm_left_cm:string; arm_right_cm:string;
  thigh_left_cm:string; thigh_right_cm:string; calf_left_cm:string; calf_right_cm:string; notes:string;
};
type NexusAssessment = Record<Exclude<keyof Draft,"notes">,number|string|null> & {summary:string;model:string};

function localToday(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date());}
function numberOrNull(value:string){if(!value.trim())return null;const n=Number(value.replace(",","."));return Number.isFinite(n)?n:null;}
function safeFileName(name:string){return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").toLowerCase();}

const metricFields:[keyof Draft,string,string][]=[
  ["weight_kg","Peso","kg"],["height_cm","Altura","cm"],["body_fat_pct","Gordura corporal","%"],
  ["chest_cm","Peitoral","cm"],["waist_cm","Cintura","cm"],["abdomen_cm","Abdômen","cm"],["hips_cm","Quadril","cm"],
  ["arm_left_cm","Braço esquerdo","cm"],["arm_right_cm","Braço direito","cm"],["thigh_left_cm","Coxa esquerda","cm"],
  ["thigh_right_cm","Coxa direita","cm"],["calf_left_cm","Panturrilha esquerda","cm"],["calf_right_cm","Panturrilha direita","cm"],
];

export function PhysiqueAssessmentForm({athleteId}:{athleteId:string}){
  const router=useRouter();
  const [draft,setDraft]=useState<Draft>({assessed_on:localToday(),weight_kg:"",height_cm:"",body_fat_pct:"",chest_cm:"",waist_cm:"",abdomen_cm:"",hips_cm:"",arm_left_cm:"",arm_right_cm:"",thigh_left_cm:"",thigh_right_cm:"",calf_left_cm:"",calf_right_cm:"",notes:""});
  const [pdf,setPdf]=useState<File|null>(null);const [front,setFront]=useState<File|null>(null);const [side,setSide]=useState<File|null>(null);const [back,setBack]=useState<File|null>(null);
  const [reading,setReading]=useState(false);const [saving,setSaving]=useState(false);const [message,setMessage]=useState<string|null>(null);const [nexus,setNexus]=useState<NexusAssessment|null>(null);
  function update(key:keyof Draft,value:string){setDraft((current)=>({...current,[key]:value}));}

  async function interpret(){
    if(!pdf){setMessage("Selecione o PDF da avaliação.");return;}if(pdf.size>4*1024*1024){setMessage("O PDF deve ter no máximo 4 MB para leitura pelo Nexus.");return;}setReading(true);setMessage(null);
    try{const form=new FormData();form.set("file",pdf);const response=await fetch("/api/physique/interpretar-avaliacao",{method:"POST",body:form});const data=await response.json();if(!response.ok)throw new Error(data?.error??"Não foi possível ler a avaliação.");
      const parsed=data as NexusAssessment;setNexus(parsed);setDraft((current)=>{const next={...current};for(const [key] of metricFields){const value=parsed[key];if(!String(current[key]??"").trim()&&value!==null&&value!==undefined)next[key]=String(value);}if(!current.assessed_on&&parsed.assessed_on)next.assessed_on=String(parsed.assessed_on);if(!current.notes.trim()&&parsed.summary)next.notes=parsed.summary;return next;});setMessage("Avaliação lida pelo Nexus. Confira as medidas antes de salvar.");
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível interpretar a avaliação.");}finally{setReading(false);}
  }

  async function uploadAttachment(supabase:ReturnType<typeof createClient>,assessmentId:string,type:string,file:File){const path=`athletes/${athleteId}/assessments/${assessmentId}/${type}-${Date.now()}-${safeFileName(file.name)}`;const upload=await supabase.storage.from("physique-training-files").upload(path,file,{contentType:file.type||undefined,upsert:false});if(upload.error)throw upload.error;const insert=await supabase.from("physique_assessment_attachments").insert({assessment_id:assessmentId,attachment_type:type,file_name:file.name,file_url:path,mime_type:file.type||null,file_size_bytes:file.size});if(insert.error)throw insert.error;}

  async function save(){setSaving(true);setMessage(null);try{const supabase=createClient();const hasPhotos=Boolean(front||side||back);const sourceType=pdf&&hasPhotos?"mixed":pdf?"pdf":"manual";const payload:Record<string,unknown>={athlete_id:athleteId,assessed_on:draft.assessed_on,source_type:sourceType,notes:draft.notes.trim()||null,ai_status:nexus?"reviewed":"not_requested",ai_model:nexus?.model??null,ai_payload:nexus??{},ai_interpreted_at:nexus?new Date().toISOString():null};for(const [key] of metricFields)payload[key]=numberOrNull(draft[key]);const {data,error}=await supabase.from("physique_assessments").insert(payload).select("id").single();if(error)throw error;const id=String(data.id);if(pdf)await uploadAttachment(supabase,id,"assessment_pdf",pdf);if(front)await uploadAttachment(supabase,id,"front",front);if(side)await uploadAttachment(supabase,id,"side",side);if(back)await uploadAttachment(supabase,id,"back",back);setMessage("Avaliação salva no histórico de evolução.");setPdf(null);setFront(null);setSide(null);setBack(null);setNexus(null);router.refresh();}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível salvar a avaliação.");}finally{setSaving(false);}}

  return <div className="physique-form">
    <div className="physique-form-heading"><Camera size={20}/><div><strong>Nova avaliação / evolução</strong><span>PDF, medidas e fotos de frente, lado e costas no mesmo registro.</span></div></div>
    <div className="physique-form-grid two"><label className="field"><span>Data da avaliação</span><input className="input" type="date" value={draft.assessed_on} onChange={(e)=>update("assessed_on",e.target.value)}/></label><label className="field"><span>PDF da avaliação</span><input className="input" type="file" accept="application/pdf,.pdf" onChange={(e)=>{setPdf(e.target.files?.[0]??null);setNexus(null);}}/></label></div>
    <button className="physique-action-button" type="button" disabled={!pdf||reading} onClick={interpret}>{reading?<LoaderCircle className="spin" size={15}/>:<FileSearch size={15}/>} {reading?"Nexus lendo avaliação":"Ler PDF com Nexus"}</button>
    {nexus&&<div className="physique-nexus-preview-head"><CheckCircle2 size={18}/><div><strong>Dados extraídos para revisão</strong><span>{nexus.summary}</span></div></div>}
    <div className="physique-form-grid three">{metricFields.map(([key,label,unit])=><label className="field" key={key}><span>{label} ({unit})</span><input className="input" inputMode="decimal" value={draft[key]} onChange={(e)=>update(key,e.target.value)}/></label>)}</div>
    <label className="field"><span>Observações</span><textarea className="textarea" rows={3} value={draft.notes} onChange={(e)=>update("notes",e.target.value)} placeholder="Pontos da avaliação, percepção visual, contexto da evolução..."/></label>
    <div className="physique-photo-upload-grid"><label className="field"><span>Foto de frente</span><input className="input" type="file" accept="image/*" onChange={(e)=>setFront(e.target.files?.[0]??null)}/></label><label className="field"><span>Foto lateral</span><input className="input" type="file" accept="image/*" onChange={(e)=>setSide(e.target.files?.[0]??null)}/></label><label className="field"><span>Foto de costas</span><input className="input" type="file" accept="image/*" onChange={(e)=>setBack(e.target.files?.[0]??null)}/></label></div>
    <button className="physique-action-button secondary" type="button" disabled={saving} onClick={save}>{saving?<LoaderCircle className="spin" size={15}/>:<Save size={15}/>} {saving?"Salvando":"Salvar avaliação e evolução"}</button>
    {message&&<p className="physique-form-message">{message}</p>}
  </div>;
}
