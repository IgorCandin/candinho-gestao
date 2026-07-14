"use client";

import { CheckCircle2, LoaderCircle, Save, ShieldCheck, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserPermissionRow } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const roleLabels = {
  admin: "Administrador",
  operator: "Operador",
  partner: "Somente leitura",
};

function UserPermissionCard({ user, currentUserId }: { user: UserPermissionRow; currentUserId: string | null }) {
  const router = useRouter();
  const isSelf = user.id === currentUserId;
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState<UserPermissionRow["role"]>(user.role);
  const [active, setActive] = useState(user.active);
  const [supplements, setSupplements] = useState(user.can_access_supplements);
  const [fitness, setFitness] = useState(user.can_access_fitness);
  const [manageUsers, setManageUsers] = useState(user.can_manage_users);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function changeRole(value: UserPermissionRow["role"]) {
    setRole(value);
    if (value === "admin") {
      setActive(true);
      setSupplements(true);
      setFitness(true);
      setManageUsers(true);
    } else {
      setManageUsers(false);
    }
  }

  async function save() {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_user_permissions", {
        p_user_id: user.id,
        p_full_name: fullName.trim(),
        p_role: role,
        p_active: active,
        p_can_access_supplements: supplements,
        p_can_access_fitness: fitness,
        p_can_manage_users: manageUsers,
      });
      if (error) throw error;
      setMessage("Acesso atualizado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o acesso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className={`panel user-permission-card ${active ? "" : "inactive"}`}>
      <div className="panel-head user-permission-head">
        <div className="user-permission-identity">
          <span className="user-permission-avatar"><UserCog size={19} /></span>
          <div>
            <h2>{user.full_name}</h2>
            <p>{user.email}</p>
          </div>
        </div>
        <span className={`user-access-status ${active ? "active" : "inactive"}`}>{active ? "Ativo" : "Bloqueado"}</span>
      </div>

      <div className="panel-body user-permission-body">
        <div className="form-grid-two">
          <label className="field">
            <span>Nome exibido</span>
            <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="field">
            <span>Perfil</span>
            <select className="select" value={role} onChange={(event) => changeRole(event.target.value as UserPermissionRow["role"])} disabled={isSelf}>
              <option value="admin">Administrador</option>
              <option value="operator">Operador</option>
              <option value="partner">Somente leitura</option>
            </select>
            <small>{roleLabels[role]}</small>
          </label>
        </div>

        <div className="user-operation-grid">
          <label className="switch-row">
            <div><strong>Candinho Suplementos</strong><span>Acesso à operação, vendas, estoque, produtos e CRM.</span></div>
            <input type="checkbox" checked={supplements} disabled={role === "admin" || isSelf} onChange={(event) => setSupplements(event.target.checked)} />
          </label>
          <label className="switch-row">
            <div><strong>Candinho Fitness</strong><span>Acesso à operação Fitness e aos próximos módulos comerciais.</span></div>
            <input type="checkbox" checked={fitness} disabled={role === "admin"} onChange={(event) => setFitness(event.target.checked)} />
          </label>
          <label className="switch-row">
            <div><strong>Gerenciar usuários</strong><span>Permite alterar perfis e acessos. Disponível apenas para administrador.</span></div>
            <input type="checkbox" checked={manageUsers} disabled={role !== "admin" || isSelf} onChange={(event) => setManageUsers(event.target.checked)} />
          </label>
          <label className="switch-row">
            <div><strong>Usuário ativo</strong><span>Ao bloquear, a pessoa perde o acesso às operações.</span></div>
            <input type="checkbox" checked={active} disabled={isSelf} onChange={(event) => setActive(event.target.checked)} />
          </label>
        </div>

        <div className="user-permission-meta">
          <span>Último acesso: <strong>{formatDateTime(user.last_sign_in_at)}</strong></span>
          <span>Conta criada: <strong>{formatDateTime(user.created_at)}</strong></span>
        </div>

        <div className="user-permission-footer">
          {message && <span className={`user-permission-message ${message === "Acesso atualizado." ? "success" : "error"}`}>
            {message === "Acesso atualizado." && <CheckCircle2 size={15} />}{message}
          </span>}
          <button className="button gold" type="button" disabled={loading} onClick={save}>
            {loading ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
            {loading ? "Salvando" : "Salvar acesso"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function UserPermissionsManager({ users, currentUserId }: { users: UserPermissionRow[]; currentUserId: string | null }) {
  return (
    <section className="user-permissions-layout">
      <div className="user-permission-notice">
        <ShieldCheck size={19} />
        <div>
          <strong>Segurança por operação</strong>
          <span>O bloqueio acontece no menu, nas rotas e no próprio banco de dados.</span>
        </div>
      </div>
      <div className="user-permission-list">
        {users.map((user) => <UserPermissionCard key={user.id} user={user} currentUserId={currentUserId} />)}
      </div>
      <article className="panel user-auth-note">
        <div className="panel-body">
          <strong>Nova pessoa na equipe</strong>
          <p>Depois que a conta for criada no Supabase Authentication, ela aparecerá aqui automaticamente sem acesso a nenhuma operação. O administrador libera somente o necessário.</p>
        </div>
      </article>
    </section>
  );
}
