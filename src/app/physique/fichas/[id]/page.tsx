import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Dumbbell, Paperclip, Sparkles } from "lucide-react";
import { PhysiqueTrainingAttachmentUpload } from "@/components/physique-training-attachment-upload";
import { getPhysiqueTrainingPlanDetails } from "@/lib/physique-data";

function bytes(value:number|null){if(value==null)return "";if(value<1024)return `${value} B`;if(value<1024*1024)return `${Math.round(value/1024)} KB`;return `${(value/(1024*1024)).toFixed(1)} MB`;}

export default async function PhysiqueTrainingPlanDetailsPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const details=await getPhysiqueTrainingPlanDetails(id);if(!details)notFound();const {plan,athlete,days,exercises,attachments}=details;
  return <section className="physique-page">
    <header className="physique-subpage-header"><Link href="/physique/fichas"><ArrowLeft size={16}/> Fichas</Link><div><span>{plan.status} · {plan.source_type}</span><h1>{plan.title}</h1><p>{athlete?<Link href={`/physique/atletas/${athlete.id}`}>{athlete.display_name}</Link>:"Atleta"} · {plan.goal??"Objetivo não informado"}</p></div></header>
    {plan.ai_imported_at&&<article className="physique-nexus-preview-head"><Sparkles size={18}/><div><strong>Ficha estruturada pelo Nexus</strong><span>O PDF original foi preservado e a estrutura abaixo foi salva para consulta rápida.</span></div></article>}
    <article className="physique-panel"><div className="physique-panel-title"><div><span>Ficha estruturada</span><h2>Treinos</h2></div><b>{days.length}</b></div>{days.length===0?<div className="physique-empty compact"><Dumbbell size={23}/><strong>Nenhum dia estruturado nesta ficha</strong></div>:<div className="physique-training-days">{days.map((day)=>{const dayExercises=exercises.filter((item)=>item.day_id===day.id);return <section key={day.id}><header><small>Treino {day.day_order}</small><h3>{day.day_label}</h3><p>{day.focus??day.notes??"Sem foco descrito"}</p></header><div className="physique-exercise-list">{dayExercises.map((exercise)=><article key={exercise.id}><b>{exercise.exercise_order}</b><div><strong>{exercise.exercise_name}</strong><span>{[exercise.sets_text,exercise.reps_text].filter(Boolean).join(" × ")||"Séries/repetições não informadas"}</span>{(exercise.technique||exercise.load_guidance||exercise.notes)&&<small>{[exercise.technique,exercise.load_guidance,exercise.notes].filter(Boolean).join(" · ")}</small>}</div>{exercise.rest_seconds!=null&&<em>{exercise.rest_seconds}s</em>}</article>)}</div></section>;})}</div>}</article>
    <article className="physique-panel"><div className="physique-panel-title"><div><span>Armazenamento privado</span><h2>Anexos da ficha</h2></div><b>{attachments.length}</b></div><PhysiqueTrainingAttachmentUpload planId={plan.id}/>{attachments.length===0?<div className="physique-empty compact"><Paperclip size={23}/><strong>Nenhum anexo nesta ficha</strong></div>:<div className="physique-attachment-list">{attachments.map((attachment)=><div key={attachment.id}><Paperclip size={16}/><div><strong>{attachment.file_name}</strong><span>{attachment.mime_type??"Arquivo"} {bytes(attachment.file_size_bytes)}</span></div>{attachment.signed_url&&<a href={attachment.signed_url} target="_blank" rel="noreferrer"><Download size={15}/> Abrir</a>}</div>)}</div>}</article>
  </section>;
}
