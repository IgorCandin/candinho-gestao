import type { GoogleReviewsResult } from "@/lib/google-business-reviews";
import styles from "./google-reviews-connection.module.css";

const messages = {
  configuration: "Falta concluir a configuração da conta e do perfil. Os depoimentos manuais continuam aparecendo.",
  authorization: "A autorização do Google expirou, foi revogada ou não foi aceita. Reconecte a conta administradora.",
  permission: "O Google recusou o acesso à API ou ao perfil. Confira a aprovação do projeto, as APIs habilitadas e a conta administradora.",
  quota: "O limite de consultas do Google foi atingido. Tente novamente mais tarde e confira a cota do projeto.",
  response: "O Google não retornou avaliações válidas nesta consulta. Os depoimentos manuais continuam disponíveis.",
  network: "Não foi possível concluir a consulta ao Google agora. Tente novamente em alguns minutos.",
};
export function GoogleReviewsConnection({ result, configured }: { result: GoogleReviewsResult; configured: { client: boolean; account: boolean; profile: boolean } }) {
  const connected = result.status === "connected";
  return <article className={`panel ${styles.connection}`} aria-label="Integração de avaliações do Google">
    <div className="panel-head"><div><h2>Avaliações do Google</h2><p>{connected ? "Conexão validada nesta consulta. As vitrines usam as avaliações do perfil selecionado." : messages[result.reason ?? "configuration"]}</p></div><span className={`badge ${connected ? "green" : "gray"}`}>{connected ? "Conectado" : "Conexão pendente"}</span></div>
    <ol className={styles.steps}>
      <li><strong>Liberação pelo Google</strong><span>{connected ? "A API respondeu nesta consulta." : "Pedido enviado; aprovação deve ser confirmada pelo retorno do Google."}</span></li>
      <li><strong>Aplicativo de conexão</strong><span>{configured.client ? "Credenciais configuradas no servidor." : "Preparar o cliente OAuth no projeto da Candinho."}</span></li>
      <li><strong>Autorizar a conta</strong><span>{configured.account ? "Autorização configurada; a consulta confirma sua validade." : "Após a liberação, autorizar a conta administradora pelo assistente local."}</span></li>
      <li><strong>Selecionar o perfil</strong><span>{configured.profile ? "Perfil configurado; conferir os relatos com a página da loja no Maps." : "O assistente lista os perfis e pede confirmação antes de salvar a conexão."}</span></li>
    </ol>
    <p>{connected ? `${result.items.length} avaliação(ões) com texto nesta seleção. ` : ""}São exibidos até seis relatos recentes com texto, sem filtro por nota. Nome, estrelas e comentário são preservados. A atualização acontece ao abrir ou recarregar a Vitrine.</p>
    <p>Os depoimentos manuais ficam guardados e são usados se a conexão não estiver disponível.</p>
    <div className={styles.actions}><form action="/company/vitrine" method="get"><button className="button ghost" type="submit">Verificar conexão novamente</button></form><a className="button ghost" href="https://maps.app.goo.gl/jBwJKoXhCydht8Vd8" target="_blank" rel="noopener noreferrer">Abrir perfil no Google ↗</a></div>
    <details><summary>Dados do pedido e preparação</summary><dl><dt>Projeto</dt><dd>My Maps Project · stable-glass-489311-m7</dd><dt>Número</dt><dd>923790320974</dd><dt>Protocolo do Google</dt><dd>7-3896000042034</dd></dl><p>A concessão de acesso é feita na página oficial do Google. Não envie senha ou tokens por mensagem.</p><a href="https://console.cloud.google.com/auth/overview?project=stable-glass-489311-m7" target="_blank" rel="noopener noreferrer">Abrir configuração OAuth no Google Cloud ↗</a></details>
  </article>;
}
