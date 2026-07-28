import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  Link2,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import { CentralMediaUploader } from "@/components/central-media-uploader";
import { PageHeader } from "@/components/page-header";
import {
  getCentralContacts,
  getCentralMediaAssets,
} from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function AssetIcon({
  mime,
}: {
  mime: string | null;
}) {
  if (mime?.startsWith("video/"))
    return <Video size={28} />;
  if (mime === "application/pdf")
    return <FileText size={28} />;
  return <ImageIcon size={28} />;
}

function aiCategory(
  metadata: Record<string, unknown> | null,
) {
  const value = metadata?.category;
  return typeof value === "string" &&
    value.trim()
    ? value
    : null;
}

export default async function CentralMediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    scope?: string;
    kind?: string;
    ai?: string;
    contact?: string;
  }>;
}) {
  const access = await getCurrentUserAccess();

  if (
    !(
      access.role === "admin" ||
      access.canAccessSupplements ||
      access.canAccessFitness ||
      access.canAccessMarketing
    )
  ) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  if (
    params.scope === "marketing" &&
    (access.role === "admin" ||
      access.canAccessMarketing)
  ) {
    redirect("/marketing/ideias");
  }

  const allowedScopes = [
    access.role === "admin" ? "company" : null,
    access.canAccessSupplements
      ? "supplements"
      : null,
    access.canAccessFitness ? "fitness" : null,
    access.canAccessMarketing
      ? "marketing"
      : null,
  ].filter(
    (item): item is string => Boolean(item),
  );

  const requestedScope =
    params.scope &&
    allowedScopes.includes(params.scope)
      ? params.scope
      : null;

  const requestedKind = [
    "image",
    "video",
    "document",
  ].includes(params.kind ?? "")
    ? params.kind!
    : null;

  const requestedAi = [
    "classified",
    "pending",
    "not_applicable",
  ].includes(params.ai ?? "")
    ? params.ai!
    : null;

  const contacts = await getCentralContacts();

  const requestedContact =
    params.contact &&
    contacts.some(
      (item) => item.id === params.contact,
    )
      ? params.contact
      : null;

  const assets = await getCentralMediaAssets(
    params.q ?? "",
    requestedScope,
    requestedKind,
    requestedAi,
    requestedContact,
  );

  const aiReady = Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY,
  );

  const classifiedCount = assets.filter(
    (asset) =>
      Boolean(asset.description_ai),
  ).length;

  const linkedCount = assets.filter(
    (asset) =>
      Boolean(
        asset.contact_id ||
          asset.conversation_id,
      ),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Biblioteca de mídia"
        description="Organize fotos, vídeos e documentos por operação, cliente e contexto."
      />

      <article className="panel central-media-upload-panel">
        <div className="panel-body">
          <CentralMediaUploader
            scopes={allowedScopes}
            contacts={contacts}
          />
        </div>
      </article>

      <section className="central-media-summary central-media-summary-v2">
        <div>
          <span>Arquivos exibidos</span>
          <strong>{assets.length}</strong>
        </div>

        <div>
          <span>Classificados por IA</span>
          <strong>
            {classifiedCount}
          </strong>
        </div>

        <div>
          <span>Ligados a contexto</span>
          <strong>{linkedCount}</strong>
        </div>

        <div
          className={
            aiReady ? "ready" : "waiting"
          }
        >
          <span>Nexus Mídia</span>
          <strong>
            {aiReady
              ? "Pronto"
              : "Sem provedor"}
          </strong>
        </div>
      </section>

      <form
        className="central-media-search central-media-search-v2"
        method="get"
      >
        <label>
          <Search size={16} />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Ex.: creatina, academia, feedback, story..."
          />
        </label>

        <select
          name="scope"
          defaultValue={
            requestedScope ?? ""
          }
        >
          <option value="">
            Todas as operações
          </option>
          {allowedScopes.map((scope) => (
            <option
              value={scope}
              key={scope}
            >
              {scope === "company"
                ? "Company"
                : scope === "supplements"
                  ? "Suplementos"
                  : scope === "fitness"
                    ? "Fitness"
                    : "Marketing"}
            </option>
          ))}
        </select>

        <select
          name="kind"
          defaultValue={
            requestedKind ?? ""
          }
        >
          <option value="">
            Todos os tipos
          </option>
          <option value="image">
            Imagens
          </option>
          <option value="video">
            Vídeos
          </option>
          <option value="document">
            Documentos
          </option>
        </select>

        <select
          name="ai"
          defaultValue={requestedAi ?? ""}
        >
          <option value="">
            Todos os status IA
          </option>
          <option value="classified">
            Classificados
          </option>
          <option value="pending">
            Aguardando IA
          </option>
          <option value="not_applicable">
            Sem análise visual
          </option>
        </select>

        <select
          name="contact"
          defaultValue={
            requestedContact ?? ""
          }
        >
          <option value="">
            Todos os contatos
          </option>
          {contacts.map((contact) => (
            <option
              value={contact.id}
              key={contact.id}
            >
              {contact.display_name}
            </option>
          ))}
        </select>

        <button
          className="button ghost"
          type="submit"
        >
          Filtrar
        </button>
      </form>

      {assets.length === 0 ? (
        <article className="panel">
          <div className="empty">
            <ImageIcon size={28} />
            <strong>
              Nenhuma mídia encontrada
            </strong>
            Envie o primeiro arquivo ou altere os filtros.
          </div>
        </article>
      ) : (
        <section className="central-media-grid">
          {assets.map((asset) => {
            const image =
              asset.mime_type?.startsWith(
                "image/",
              ) && asset.signed_url;

            const video =
              asset.mime_type?.startsWith(
                "video/",
              ) && asset.signed_url;

            const supportedImage = [
              "image/jpeg",
              "image/png",
              "image/webp",
            ].includes(
              asset.mime_type ?? "",
            );

            const classified = Boolean(
              asset.description_ai,
            );

            const category =
              aiCategory(
                asset.ai_metadata,
              );

            return (
              <Link
                href={`/central/midia/${asset.id}`}
                className="central-media-card"
                key={asset.id}
              >
                <div className="central-media-preview">
                  {image ? (
                    <img
                      src={asset.signed_url!}
                      alt={
                        asset.description_ai ??
                        asset.original_filename ??
                        "Mídia"
                      }
                    />
                  ) : video ? (
                    <video
                      src={asset.signed_url!}
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <AssetIcon
                      mime={
                        asset.mime_type
                      }
                    />
                  )}
                </div>

                <div className="central-media-card-body">
                  <div>
                    <span>
                      {
                        asset.operation_scope
                      }
                    </span>
                    <small>
                      {formatDateTime(
                        asset.created_at,
                      )}
                    </small>
                  </div>

                  <strong>
                    {asset.description_ai ??
                      asset.original_filename ??
                      "Arquivo sem nome"}
                  </strong>

                  <div
                    className={`central-media-ai-status ${
                      classified
                        ? "ready"
                        : "waiting"
                    }`}
                  >
                    {classified ? (
                      <CheckCircle2
                        size={13}
                      />
                    ) : supportedImage ? (
                      <Clock3 size={13} />
                    ) : (
                      <Sparkles
                        size={13}
                      />
                    )}

                    <span>
                      {classified
                        ? "Classificado pelo Nexus"
                        : supportedImage
                          ? aiReady
                            ? "Aguardando classificação"
                            : "Nexus sem provedor"
                          : "Arquivo armazenado"}
                    </span>
                  </div>

                  {asset.contact_name && (
                    <small className="central-media-linked">
                      <Link2 size={12} />
                      {
                        asset.contact_name
                      }
                    </small>
                  )}

                  {category && (
                    <small className="central-media-category">
                      Categoria:{" "}
                      {category}
                    </small>
                  )}

                  {asset.tags?.length >
                    0 && (
                    <div className="central-media-tags">
                      {asset.tags
                        .slice(0, 7)
                        .map((tag) => (
                          <i key={tag}>
                            {tag}
                          </i>
                        ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </>
  );
}
