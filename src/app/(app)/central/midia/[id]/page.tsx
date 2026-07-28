import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  Link2,
  Sparkles,
} from "lucide-react";
import { CentralMediaClassifyButton } from "@/components/central-media-classify-button";
import { CentralMediaDeleteButton } from "@/components/central-media-delete-button";
import { CentralMediaLinkForm } from "@/components/central-media-link-form";
import { CentralMediaPreviewViewer } from "@/components/central-media-preview-viewer";
import { PageHeader } from "@/components/page-header";
import {
  getCentralContacts,
  getCentralMediaAssetDetails,
} from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function value(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const item = metadata?.[key];

  if (typeof item === "string") return item;

  if (Array.isArray(item)) {
    return item
      .filter(
        (entry): entry is string =>
          typeof entry === "string",
      )
      .join(", ");
  }

  return null;
}

function operationLabel(value: string) {
  if (value === "supplements") return "Suplementos";
  if (value === "fitness") return "Fitness";
  if (value === "marketing") return "Marketing";
  return "Company";
}

export default async function CentralMediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  const [asset, contacts] = await Promise.all([
    getCentralMediaAssetDetails(id),
    getCentralContacts(),
  ]);

  if (!asset) notFound();

  const isImage =
    asset.mime_type?.startsWith("image/");
  const isVideo =
    asset.mime_type?.startsWith("video/");

  const supportedImage = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ].includes(asset.mime_type ?? "");

  const aiReady = Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY,
  );

  const category = value(
    asset.ai_metadata,
    "category",
  );
  const environment = value(
    asset.ai_metadata,
    "environment",
  );
  const suggestedUse = value(
    asset.ai_metadata,
    "suggested_use",
  );
  const recognizedProducts = value(
    asset.ai_metadata,
    "recognized_products",
  );
  const provider = value(
    asset.ai_metadata,
    "nexus_provider",
  );

  const filename =
    asset.original_filename ?? "arquivo";

  const classified = Boolean(
    asset.description_ai,
  );

  return (
    <div className="central-media-detail-v2">
      <PageHeader
        eyebrow="Candinho Central · Mídia"
        title={filename}
        description={
          classified
            ? asset.description_ai!
            : "Visualize, organize e classifique este arquivo sem sair da biblioteca."
        }
        action={
          <div className="page-header-actions">
            <Link
              href="/central/midia"
              className="button ghost"
            >
              <ArrowLeft size={15} />
              Biblioteca
            </Link>

            <CentralMediaDeleteButton
              assetId={asset.id}
              filename={filename}
            />
          </div>
        }
      />

      <section className="central-media-detail-v2-grid">
        <div className="central-media-detail-v2-main">
          <article className="central-media-viewer-card">
            {isImage && asset.signed_url ? (
              <CentralMediaPreviewViewer
                url={asset.signed_url}
                alt={
                  asset.description_ai ??
                  filename
                }
              />
            ) : isVideo &&
              asset.signed_url ? (
              <div className="central-media-viewer-stage">
                <video
                  src={asset.signed_url}
                  controls
                  preload="metadata"
                />
              </div>
            ) : (
              <div className="central-media-viewer-stage">
                {asset.mime_type ===
                "application/pdf" ? (
                  <FileText size={62} />
                ) : (
                  <ImageIcon size={62} />
                )}
              </div>
            )}
          </article>

          <section className="central-media-file-strip">
            <div>
              <span>Operação</span>
              <strong>
                {operationLabel(
                  asset.operation_scope,
                )}
              </strong>
            </div>

            <div>
              <span>Tipo</span>
              <strong>
                {asset.mime_type ??
                  "Não informado"}
              </strong>
            </div>

            <div>
              <span>Origem</span>
              <strong>
                {asset.source ?? "upload"}
              </strong>
            </div>

            <div>
              <span>Adicionado</span>
              <strong>
                {formatDateTime(
                  asset.created_at,
                )}
              </strong>
            </div>
          </section>

          {asset.tags.length > 0 && (
            <div className="central-media-tags-v2">
              {asset.tags.map((tag) => (
                <i key={tag}>{tag}</i>
              ))}
            </div>
          )}
        </div>

        <aside className="central-media-detail-v2-side">
          <article className="central-media-side-card central-media-nexus-card">
            <div className="central-media-side-card-head">
              <div>
                <Sparkles size={17} />
                <div>
                  <strong>Nexus Mídia</strong>
                  <small>
                    Entende a imagem e cria contexto para busca.
                  </small>
                </div>
              </div>

              <span
                className={`central-media-nexus-status ${
                  classified
                    ? "ready"
                    : aiReady
                      ? ""
                      : "waiting"
                }`}
              >
                {classified
                  ? provider === "gemini"
                    ? "Gemini"
                    : provider === "openai"
                      ? "OpenAI"
                      : "Classificado"
                  : aiReady
                    ? "Pronto"
                    : "Indisponível"}
              </span>
            </div>

            <div className="central-media-side-card-body">
              {classified ? (
                <div className="central-media-ai-meta-grid">
                  {category && (
                    <div>
                      <span>Categoria</span>
                      <strong>{category}</strong>
                    </div>
                  )}

                  {environment && (
                    <div>
                      <span>Ambiente</span>
                      <strong>{environment}</strong>
                    </div>
                  )}

                  {recognizedProducts && (
                    <div>
                      <span>Produtos reconhecidos</span>
                      <strong>
                        {recognizedProducts}
                      </strong>
                    </div>
                  )}

                  {suggestedUse && (
                    <div>
                      <span>Uso sugerido</span>
                      <strong>
                        {suggestedUse}
                      </strong>
                    </div>
                  )}
                </div>
              ) : (
                <p
                  style={{
                    margin: "0 0 12px",
                    color: "var(--muted)",
                    fontSize: 11,
                    lineHeight: 1.55,
                  }}
                >
                  {supportedImage
                    ? aiReady
                      ? "A imagem ainda não foi analisada. O Nexus pode classificar agora usando o provedor disponível."
                      : "Nenhum provedor do Nexus está configurado neste deployment."
                    : "Este tipo de arquivo não usa análise visual automática."}
                </p>
              )}

              {supportedImage && (
                <CentralMediaClassifyButton
                  assetId={asset.id}
                  disabled={!aiReady}
                />
              )}
            </div>
          </article>

          <article className="central-media-side-card">
            <div className="central-media-side-card-head">
              <div>
                <Link2 size={17} />
                <div>
                  <strong>Contexto</strong>
                  <small>
                    Ligue a mídia ao cliente quando fizer sentido.
                  </small>
                </div>
              </div>
            </div>

            <div className="central-media-side-card-body">
              <CentralMediaLinkForm
                assetId={asset.id}
                currentContactId={
                  asset.contact_id
                }
                currentConversationId={
                  asset.conversation_id
                }
                contacts={contacts}
              />
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
