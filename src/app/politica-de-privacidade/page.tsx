import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | Candinho Central",
  description:
    "Política de Privacidade da Candinho Central e informações sobre o tratamento de dados pessoais.",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07090d",
        color: "#f5f5f5",
        padding: "48px 20px",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <article
        style={{
          maxWidth: "820px",
          margin: "0 auto",
          lineHeight: 1.7,
        }}
      >
        <header style={{ marginBottom: "40px" }}>
          <p
            style={{
              color: "#9ca3af",
              margin: "0 0 8px",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Candinho Central
          </p>

          <h1
            style={{
              fontSize: "36px",
              lineHeight: 1.2,
              margin: "0 0 16px",
            }}
          >
            Política de Privacidade
          </h1>

          <p style={{ color: "#9ca3af", margin: 0 }}>
            Última atualização: 18 de julho de 2026
          </p>
        </header>

        <Section title="1. Sobre esta Política">
          <p>
            A Candinho Central respeita a privacidade e a proteção dos dados
            pessoais das pessoas que entram em contato com nossas operações,
            produtos, serviços e canais de atendimento.
          </p>

          <p>
            Esta Política de Privacidade explica quais informações podem ser
            tratadas pela Candinho Central, como elas são utilizadas e quais
            medidas são adotadas para proteger essas informações.
          </p>
        </Section>

        <Section title="2. Dados que podemos tratar">
          <p>
            Dependendo da interação realizada com nossos canais, podemos tratar
            informações como:
          </p>

          <ul>
            <li>nome e informações de identificação fornecidas pelo usuário;</li>
            <li>número de telefone;</li>
            <li>endereço de e-mail;</li>
            <li>nome de usuário ou identificação em redes sociais;</li>
            <li>
              mensagens e conteúdos enviados por WhatsApp, Instagram, Facebook
              ou outros canais conectados;
            </li>
            <li>
              informações necessárias para atendimento, relacionamento com o
              cliente e histórico de interações;
            </li>
            <li>
              informações técnicas fornecidas pelas plataformas utilizadas para
              viabilizar a integração e o atendimento.
            </li>
          </ul>
        </Section>

        <Section title="3. Como utilizamos os dados">
          <p>Os dados podem ser utilizados para:</p>

          <ul>
            <li>receber e responder mensagens enviadas pelos usuários;</li>
            <li>
              centralizar atendimentos realizados por diferentes canais de
              comunicação;
            </li>
            <li>identificar e organizar contatos e clientes;</li>
            <li>manter histórico de atendimento e relacionamento;</li>
            <li>prestar suporte e responder solicitações;</li>
            <li>melhorar nossos serviços, processos e experiência de atendimento;</li>
            <li>proteger a segurança e a integridade de nossos sistemas;</li>
            <li>cumprir obrigações legais e regulatórias aplicáveis.</li>
          </ul>
        </Section>

        <Section title="4. Integrações com plataformas de terceiros">
          <p>
            A Candinho Central pode utilizar integrações disponibilizadas por
            plataformas de terceiros, incluindo serviços da Meta, como WhatsApp,
            Instagram e Facebook.
          </p>

          <p>
            Quando um usuário entra em contato por uma dessas plataformas,
            informações necessárias para o atendimento podem ser recebidas e
            processadas pela Candinho Central conforme as permissões e
            funcionalidades disponibilizadas pela respectiva plataforma.
          </p>

          <p>
            O uso das próprias plataformas de terceiros também está sujeito aos
            termos e políticas de privacidade estabelecidos por seus respectivos
            responsáveis.
          </p>
        </Section>

        <Section title="5. Compartilhamento de dados">
          <p>
            A Candinho Central não comercializa dados pessoais.
          </p>

          <p>
            Informações podem ser compartilhadas somente quando necessário para
            o funcionamento dos serviços, atendimento ao usuário, operação de
            fornecedores de tecnologia, integrações autorizadas ou cumprimento
            de obrigações legais.
          </p>
        </Section>

        <Section title="6. Armazenamento e segurança">
          <p>
            Adotamos medidas técnicas e administrativas destinadas a proteger os
            dados pessoais contra acesso não autorizado, perda, alteração,
            divulgação ou tratamento inadequado.
          </p>

          <p>
            Os dados são mantidos pelo período necessário para atender às
            finalidades descritas nesta Política, às necessidades operacionais
            da Candinho Central e às obrigações legais aplicáveis.
          </p>
        </Section>

        <Section title="7. Direitos dos titulares">
          <p>
            O titular dos dados pessoais pode solicitar, conforme aplicável e
            nos termos da legislação de proteção de dados:
          </p>

          <ul>
            <li>confirmação da existência de tratamento de seus dados;</li>
            <li>acesso aos dados pessoais tratados;</li>
            <li>correção de informações incompletas, inexatas ou desatualizadas;</li>
            <li>
              anonimização, bloqueio ou eliminação de dados quando aplicável;
            </li>
            <li>informações sobre o compartilhamento de dados;</li>
            <li>revogação de consentimento, quando aplicável;</li>
            <li>eliminação de dados pessoais nos casos previstos em lei.</li>
          </ul>
        </Section>

        <Section title="8. Solicitação de exclusão de dados">
          <p>
            O usuário pode solicitar a exclusão de seus dados pessoais e do
            histórico associado à Candinho Central entrando em contato pelos
            canais oficiais da Candinho Suplementos.
          </p>

          <p>
            As solicitações serão analisadas e atendidas conforme a legislação
            aplicável e observadas eventuais obrigações legais de conservação de
            determinadas informações.
          </p>
        </Section>

        <Section title="9. Contato">
          <p>
            Para dúvidas, solicitações relacionadas à privacidade ou exercício
            de direitos relacionados a dados pessoais, entre em contato pelos
            canais oficiais da Candinho Suplementos.
          </p>

          <p>
            Instagram: <strong>@CandinhoSuplementos</strong>
          </p>
        </Section>

        <Section title="10. Alterações desta Política">
          <p>
            Esta Política de Privacidade poderá ser atualizada periodicamente
            para refletir alterações em nossos serviços, integrações, processos
            ou requisitos legais.
          </p>

          <p>
            A versão mais recente estará sempre disponível nesta página.
          </p>
        </Section>

        <footer
          style={{
            marginTop: "48px",
            paddingTop: "24px",
            borderTop: "1px solid #27272a",
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          © 2026 Candinho Central. Todos os direitos reservados.
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "36px" }}>
      <h2
        style={{
          fontSize: "22px",
          marginBottom: "12px",
        }}
      >
        {title}
      </h2>

      <div style={{ color: "#d4d4d8" }}>{children}</div>
    </section>
  );
}
