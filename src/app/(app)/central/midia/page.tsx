import { redirect } from "next/navigation";
import { FileText, ImageIcon, Search, Video } from "lucide-react";
import { CentralMediaUploader } from "@/components/central-media-uploader";
import { PageHeader } from "@/components/page-header";
import { getCentralMediaAssets } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function AssetIcon({ mime }: { mime: string | null }) {
  if (mime?.startsWith("video/")) return <Video size={28}/>;
  if (mime === "application/pdf") return <FileText size={28}/>;
  return <ImageIcon size={28}/>;
}

export default async function CentralMediaPage({ searchParams }: { searchParams: Promise<{ q?: string; scope?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness)) redirect("/dashboard");
  const params = await searchParams;
  const allowedScopes = [access.role === "admin" ? "company" : null, access.canAccessSupplements ? "supplements" : null, access.canAccessFitness ? "fitness" : null].filter((item): item is string => Boolean(item));
  const requestedScope = params.scope && allowedScopes.includes(params.scope) ? params.scope : null;
  const assets = await getCentralMediaAssets(params.q ?? "", requestedScope);

  return <>
    <PageHeader eyebrow="Candinho Central" title="Biblioteca de mídia" description="Guarde material da Candinho em um só lugar e encontre depois por nome, descrição ou tags." />
    <article className="panel central-media-upload-panel"><div className="panel-body"><CentralMediaUploader scopes={allowedScopes}/></div></article>

    <form className="central-media-search" method="get">
      <label><Search size={16}/><input name="q" defaultValue={params.q ?? ""} placeholder="Ex.: creatina academia, feedback, story..." /></label>
      <select name="scope" defaultValue={requestedScope ?? ""}><option value="">Todos os espaços</option>{allowedScopes.map((scope) => <option value={scope} key={scope}>{scope === "company" ? "Company" : scope === "supplements" ? "Suplementos" : "Fitness"}</option>)}</select>
      <button className="button ghost" type="submit">Buscar</button>
    </form>

    {assets.length === 0 ? <article className="panel"><div className="empty"><ImageIcon size={28}/><strong>Nenhuma mídia encontrada</strong>Envie o primeiro arquivo ou altere a busca.</div></article> : <section className="central-media-grid">{assets.map((asset) => {
      const image = asset.mime_type?.startsWith("image/") && asset.signed_url;
      const video = asset.mime_type?.startsWith("video/") && asset.signed_url;
      return <article className="central-media-card" key={asset.id}>
        <div className="central-media-preview">{image ? <img src={asset.signed_url!} alt={asset.description_ai ?? asset.original_filename ?? "Mídia"}/> : video ? <video src={asset.signed_url!} controls preload="metadata"/> : <AssetIcon mime={asset.mime_type}/>}</div>
        <div className="central-media-card-body"><div><span>{asset.operation_scope}</span><small>{formatDateTime(asset.created_at)}</small></div><strong>{asset.description_ai ?? asset.original_filename ?? "Arquivo sem nome"}</strong>{asset.tags?.length > 0 && <div className="central-media-tags">{asset.tags.slice(0, 7).map((tag) => <i key={tag}>{tag}</i>)}</div>}</div>
      </article>;
    })}</section>}
  </>;
}
