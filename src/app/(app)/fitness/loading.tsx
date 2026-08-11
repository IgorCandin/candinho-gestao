export default function FitnessLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando Candinho Fitness"
    >
      <section className="panel">
        <div className="panel-body">
          <strong>Carregando Fitness…</strong>
          <p className="muted">
            Preparando a próxima tela.
          </p>
        </div>
      </section>
    </main>
  );
}
