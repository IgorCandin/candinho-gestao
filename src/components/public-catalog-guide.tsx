"use client";

import { Bot, SearchCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { PublicNexusAdvisor } from "@/components/public-nexus-advisor";
import styles from "./public-catalog-experience.module.css";

const GOALS = [
  "Quero ganhar massa",
  "Quero melhorar força e performance",
  "Quero mais energia para treinar",
  "Quero cuidar da rotina e saúde",
  "Quero entender as opções para sono",
];

export function PublicCatalogGuide() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);

  function choose(goal: string) {
    setPrompt(goal);
    setOpen(true);
  }

  return (
    <section className={styles.guide}>
      <div className={styles.guideTop}>
        <div>
          <span className={styles.guideEyebrow}>
            <Sparkles size={15} />
            Catálogo assistido
          </span>
          <h2>Não precisa escolher no escuro.</h2>
          <p>
            Você pode continuar vendo todos os produtos normalmente ou contar
            ao Nexus o que procura para filtrar as opções do catálogo.
          </p>
        </div>

        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <SearchCheck size={16} /> : <Bot size={16} />}
          {open ? "Fechar ajuda" : "Me ajude a escolher"}
        </button>
      </div>

      <div className={styles.goalGrid}>
        {GOALS.map((goal) => (
          <button
            className={styles.goalButton}
            type="button"
            onClick={() => choose(goal)}
            key={goal}
          >
            {goal}
          </button>
        ))}
      </div>

      {open && (
        <div className={styles.guidePanel}>
          <PublicNexusAdvisor
            key={prompt ?? "catalog-general"}
            initialPrompt={prompt}
          />
        </div>
      )}
    </section>
  );
}
