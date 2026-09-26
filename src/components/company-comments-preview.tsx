const COMMENTS = [
  { initials: "CN", name: "Candinho", role: "Operação", text: "Separar os pedidos confirmados antes da rota da tarde.", tone: "blue" },
  { initials: "GP", name: "Giulia", role: "Fitness", text: "Cliente confirmou a retirada das peças amanhã.", tone: "pink" },
  { initials: "PN", name: "Pâmella", role: "Parceira", text: "Reposição conferida; falta apenas registrar a entrada.", tone: "gold" },
];

export function CompanyCommentsPreview() {
  return <details className="company-comments-preview"><summary>Prévia local · comentários com perfil</summary><div>{COMMENTS.map((comment) => <article key={comment.name}><span className={`company-avatar ${comment.tone}`}>{comment.initials}</span><p><strong>{comment.name}<small>{comment.role}</small></strong>{comment.text}</p></article>)}</div><small>Comentários genéricos somente para validar o visual; nenhum dado foi salvo.</small></details>;
}
