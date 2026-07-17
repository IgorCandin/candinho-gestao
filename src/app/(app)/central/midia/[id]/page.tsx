import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, ImageIcon, Link2, Sparkles } from "lucide-react";
import { CentralMediaClassifyButton } from "@/components/central-media-classify-button";
import { CentralMediaLinkForm } from "@/components/central-media-link-form";
import { PageHeader } from "@/components/page-header";
import { getCentralContacts, getCentralInboxSnapshot, getCentralIntegrationReadiness, getCentralMediaAssetDetails } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function value(metadata: Record<string, unknown> | null, key: string) {
  const item = metadata?.[key];
  if (typeof item === "string") return item;
  if (Array.isArray(item)) return item.filter((x) => typeof x === "string").join(", ");
  return null;
}

export default async function CentralMediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const { id } = await params;
  const [asset, contacts, conversations, readiness] = await Promise.all([
    getCentralMediaAssetDetails(id),
    getCentralContacts(),
    getCentralInboxSnapshot(null, null, 200),
    access.canManageUsers ? getCentralIntegrationReadiness() : Promise.resolve(null),
  ]);
  if (!asset) notFound();
  const isImage = asset.mime_type?.startsWith("image/");
  const isVideo = asset.mime_type?.startsWith("video/");
  const supportedImage = ["image/jpeg", "image/png", "image/webp"].includes(asset.mime_type ?? "");
  const aiReady = Boolean(readiness?.openai.ready);
  const category = value(asset.ai_metadata, "category");
  const environment = value(asset.ai_metadata, "environment");
  const suggestedUse = value(asset.ai_metadata, "suggested_use");
  const recognizedProducts = value(asset.ai_metadata, "recognized_products");

  return <>
    <div className="central-media-detail-back"><Link href="/central/midia" className="button ghost"><ArrowLeft size={15}/>Voltar à biblioteca</Link></div>
    <PageHeader eyebrow="Candinho Central · Mídia" title={asset.original_filename ?? "Detalhe do arquivo"} description={asset.description_ai ?? "Arquivo armazenado na biblioteca privada da Candinho Company."}/>
    <section className="central-media-detail-layout">
      <article className="panel central-media-detail-preview-panel"><div className="central-media-detail-preview">
        {isImage && asset.signed_url ? <img src={asset.signed_url} alt={asset.description_ai ?? asset.original_filename ?? "Mídia"}/> : isVideo && asset.signed_url ? <video src={asset.signed_url} controls preload="metadata"/> : asset.mime_type === "application/pdf" ? <FileText size={54}/> : <ImageIcon size={54}/>}
      </div></article>
      <div className="central-media-detail-side">
        <article className="panel"><div className="panel-heading"><span><Link2 size={16}/><strong>Contexto</strong></span></div><div className="panel-body"><CentralMediaLinkForm assetId={asset.id} currentContactId={asset.contact_id} currentConversationId={asset.conversation_id} contacts={contacts} conversations={conversations}/></div></article>
        <article className="panel"><div className="panel-heading"><span><Sparkles size={16}/><strong>Nexus Mídia</strong></span></div><div className="panel-body central-media-ai-detail">
          <div><span>Status</span><strong>{asset.description_ai ? "Classificado" : supportedImage ? aiReady ? "Pronto para classificar" : "Aguardando chave OpenAI" : "Sem análise visual automática"}</strong></div>
          {category && <div><span>Categoria</span><strong>{category}</strong></div>}
          {environment && <div><span>Ambiente</span><strong>{environment}</strong></div>}
          {recognizedProducts && <div><span>Produtos reconhecidos</span><strong>{recognizedProducts}</strong></div>}
          {suggestedUse && <div><span>Uso sugerido</span><strong>{suggestedUse}</strong></div>}
          {supportedImage && <CentralMediaClassifyButton assetId={asset.id} disabled={!aiReady}/>} 
        </div></article>
      </div>
    </section>
    <article className="panel central-media-detail-info"><div className="panel-heading"><span><FileText size={16}/><strong>Informações do arquivo</strong></span></div><div className="central-media-detail-info-grid">
      <div><span>Operação</span><strong>{asset.operation_scope}</strong></div>
      <div><span>Tipo</span><strong>{asset.mime_type ?? "Não informado"}</strong></div>
      <div><span>Origem</span><strong>{asset.source ?? "upload"}</strong></div>
      <div><span>Adicionado em</span><strong>{formatDateTime(asset.created_at)}</strong></div>
      <div><span>Contato</span><strong>{asset.contact_name ?? "Sem vínculo"}</strong></div>
      <div><span>Conversa</span><strong>{asset.conversation_id ? "Vinculada" : "Sem vínculo"}</strong></div>
    </div>{asset.tags.length > 0 && <div className="central-media-detail-tags">{asset.tags.map((tag) => <i key={tag}>{tag}</i>)}</div>}</article>
  </>;
}
