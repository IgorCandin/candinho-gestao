"use client";

import {
  Camera,
  LoaderCircle,
  Save,
  UserRoundPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const GOALS = [
  "Hipertrofia",
  "Emagrecimento",
  "Definição",
  "Condicionamento",
  "Força",
  "Saúde e qualidade de vida",
];

async function compressAvatar(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a foto.");

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Falha ao reduzir a foto."))),
      "image/webp",
      0.84,
    );
  });

  return new File([blob], "avatar.webp", { type: "image/webp" });
}

export function PhysiqueAthleteForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [draft, setDraft] = useState({
    display_name: "",
    phone: "",
    email: "",
    instagram_username: "",
    primary_goal: "",
    notes: "",
    status: "active",
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    let avatarPath: string | null = null;

    try {
      if (!draft.display_name.trim()) {
        throw new Error("Informe o nome do atleta.");
      }

      if (avatar) {
        const prepared = await compressAvatar(avatar);
        avatarPath = `athletes/profile/${crypto.randomUUID()}-avatar.webp`;

        const upload = await supabase.storage
          .from("physique-training-files")
          .upload(avatarPath, prepared, {
            contentType: "image/webp",
            upsert: false,
          });

        if (upload.error) throw upload.error;
      }

      const { data, error } = await supabase
        .from("physique_athletes")
        .insert({
          display_name: draft.display_name.trim(),
          phone: draft.phone.trim() || null,
          email: draft.email.trim() || null,
          instagram_username: draft.instagram_username.trim() || null,
          primary_goal: draft.primary_goal.trim() || null,
          notes: draft.notes.trim() || null,
          status: draft.status,
          avatar_path: avatarPath,
        })
        .select("id")
        .single();

      if (error) throw error;

      router.push(`/physique/atletas/${data.id}`);
      router.refresh();
    } catch (error) {
      if (avatarPath) {
        await supabase.storage
          .from("physique-training-files")
          .remove([avatarPath]);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o atleta.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="physique-form" onSubmit={submit}>
      <div className="physique-form-heading">
        <UserRoundPlus size={20} />
        <div>
          <strong>Novo atleta</strong>
          <span>
            Cadastro inicial com foto principal. O dossiê evolui depois com
            avaliações, fotos, fichas e contexto.
          </span>
        </div>
      </div>

      <div className="physique-form-grid two">
        <label className="field">
          <span>Nome</span>
          <input
            className="input"
            required
            value={draft.display_name}
            onChange={(event) =>
              setDraft({ ...draft, display_name: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Status</span>
          <select
            className="select"
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value })
            }
          >
            <option value="active">Ativo</option>
            <option value="prospect">Prospect</option>
            <option value="paused">Pausado</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>

        <label className="field">
          <span>Foto principal do atleta</span>
          <input
            className="input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setAvatar(event.target.files?.[0] ?? null)}
          />
          <small>
            A imagem é reduzida antes do envio para economizar armazenamento.
          </small>
        </label>

        <label className="field">
          <span>Telefone</span>
          <input
            className="input"
            value={draft.phone}
            onChange={(event) =>
              setDraft({ ...draft, phone: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>E-mail</span>
          <input
            className="input"
            type="email"
            value={draft.email}
            onChange={(event) =>
              setDraft({ ...draft, email: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Instagram</span>
          <input
            className="input"
            value={draft.instagram_username}
            onChange={(event) =>
              setDraft({ ...draft, instagram_username: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Objetivo principal</span>
          <input
            className="input"
            value={draft.primary_goal}
            onChange={(event) =>
              setDraft({ ...draft, primary_goal: event.target.value })
            }
            placeholder="Escolha uma sugestão ou escreva livremente"
          />
          <div className="physique-goal-chips">
            {GOALS.map((goal) => (
              <button
                key={goal}
                className={`physique-goal-chip ${
                  draft.primary_goal === goal ? "active" : ""
                }`}
                type="button"
                onClick={() => setDraft({ ...draft, primary_goal: goal })}
              >
                {goal}
              </button>
            ))}
          </div>
        </label>
      </div>

      <label className="field">
        <span>Observações</span>
        <textarea
          className="textarea"
          rows={3}
          value={draft.notes}
          onChange={(event) =>
            setDraft({ ...draft, notes: event.target.value })
          }
          placeholder="Contexto inicial que ajude no acompanhamento."
        />
      </label>

      {avatar && (
        <p className="physique-form-message">
          <Camera size={13} /> Foto selecionada: {avatar.name}
        </p>
      )}

      {message && <p className="form-error visible">{message}</p>}

      <button
        className="physique-action-button secondary"
        type="submit"
        disabled={loading}
      >
        {loading ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Save size={16} />
        )}
        {loading ? "Salvando" : "Cadastrar atleta"}
      </button>
    </form>
  );
}
