"use client";

import { CheckCircle2, LoaderCircle, Save, ShieldCheck, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserPermissionRow } from "@/lib/access";
import { createClient } from "@/lib/supabase/client";

const roleLabels = {
  admin: "Perfil Administrador (Maior Licença)",
  operator: "Perfil Colaboradora",
  sales: "Perfil Vendas",
  partner: "Perfil Somente Leitura",
};

function OperationPermission({ title, viewLabel, access, write, onAccess, onWrite, disabledWrite }: { title:string; viewLabel:string; access:boolean; write:boolean; onAccess:(v:boolean)=>void; onWrite:(v:boolean)=>void; disabledWrite?:boolean }) {
  return <div className="permission-operation-card">
    <strong>{title}</strong>
    <label><span>{viewLabel}</span><input type="checkbox" checked={access} onChange={(e)=>onAccess(e.target.checked)}/></label>
    <label><span>Alterar dados</span><input type="checkbox" checked={write} disabled={!access||disabledWrite} onChange={(e)=>onWrite(e.target.checked)}/></label>
  </div>;
}

function UserPermissionCard({ user, currentUserId }: { user: UserPermissionRow; currentUserId: string | null }) {
  const router=useRouter(); const isSelf=user.id===currentUserId;
  const [fullName,setFullName]=useState(user.full_name); const [role,setRole]=useState<UserPermissionRow["role"]>(user.role); const [active,setActive]=useState(user.active);
  const [supplements,setSupplements]=useState(user.can_access_supplements); const [writeSupplements,setWriteSupplements]=useState(user.can_write_supplements);
  const [fitness,setFitness]=useState(user.can_access_fitness); const [writeFitness,setWriteFitness]=useState(user.can_write_fitness);
  const [bank,setBank]=useState(user.can_access_bank); const [writeBank,setWriteBank]=useState(user.can_write_bank);
  const [manageUsers,setManageUsers]=useState(user.can_manage_users); const [loading,setLoading]=useState(false); const [message,setMessage]=useState<string|null>(null);

  function changeRole(value:UserPermissionRow["role"]){setRole(value); if(value==="admin"){setActive(true);setSupplements(true);setWriteSupplements(true);setFitness(true);setWriteFitness(true);setBank(true);setWriteBank(true);setManageUsers(true);} else if(value==="sales"){setSupplements(true);setWriteSupplements(false);setFitness(true);setWriteFitness(false);setBank(false);setWriteBank(false);setManageUsers(false);} else {setManageUsers(false);} }
  async function save(){setLoading(true);setMessage(null);try{const supabase=createClient();const{error}=await supabase.rpc("update_user_permissions",{p_user_id:user.id,p_full_name:fullName.trim(),p_role:role,p_active:active,p_can_access_supplements:supplements,p_can_write_supplements:writeSupplements,p_can_access_fitness:fitness,p_can_write_fitness:writeFitness,p_can_access_bank:bank,p_can_write_bank:writeBank,p_can_manage_users:manageUsers});if(error)throw error;setMessage("Acesso atualizado.");router.refresh();}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível atualizar o acesso.");}finally{setLoading(false);}}

  const lockWrite=role==="sales"||role==="partner";
  return <article className={`panel user-permission-card ${active?"":"inactive"}`}>
    <div className="panel-head user-permission-head"><div className="user-permission-identity"><span className="user-permission-avatar"><UserCog size={19}/></span><div><h2>[{user.full_name}]</h2><p>{roleLabels[role]}</p></div></div><span className={`user-access-status ${active?"active":"inactive"}`}>{active?"Ativo":"Bloqueado"}</span></div>
    <div className="panel-body user-permission-body">
      <div className="form-grid-two"><label className="field"><span>Nome exibido</span><input className="input" value={fullName} onChange={(e)=>setFullName(e.target.value)}/></label><label className="field"><span>Perfil</span><select className="select" value={role} disabled={isSelf} onChange={(e)=>changeRole(e.target.value as UserPermissionRow["role"])}><option value="admin">Administrador</option><option value="operator">Colaboradora</option><option value="sales">Vendas</option><option value="partner">Somente leitura</option></select><small>{roleLabels[role]}</small></label></div>
      {role==="admin"?<div className="profile-license-summary"><ShieldCheck size={18}/><div><strong>Maior licença</strong><span>Acesso total às operações, alterações e gestão de perfis.</span></div></div>:<div className="permission-operation-grid">
        <OperationPermission title="Suplementos" viewLabel="Vendas / Visualizar" access={supplements} write={writeSupplements} onAccess={(v)=>{setSupplements(v);if(!v)setWriteSupplements(false);}} onWrite={setWriteSupplements} disabledWrite={lockWrite}/>
        <OperationPermission title="Fitness" viewLabel="Vendas / Visualizar" access={fitness} write={writeFitness} onAccess={(v)=>{setFitness(v);if(!v)setWriteFitness(false);}} onWrite={setWriteFitness} disabledWrite={lockWrite}/>
        <OperationPermission title="BANK" viewLabel="Visualizar" access={bank} write={writeBank} onAccess={(v)=>{setBank(v);if(!v)setWriteBank(false);}} onWrite={setWriteBank} disabledWrite={lockWrite}/>
      </div>}
      {role==="sales"&&<div className="sales-profile-note"><strong>Perfil Vendas</strong><span>Feito para consulta comercial. Não libera custo, edição de cadastros ou ações financeiras.</span></div>}
      <div className="user-account-controls"><label className="switch-row"><div><strong>Usuário ativo</strong><span>Bloqueia ou libera o acesso da conta.</span></div><input type="checkbox" checked={active} disabled={isSelf} onChange={(e)=>setActive(e.target.checked)}/></label>{role==="admin"&&<label className="switch-row"><div><strong>Gerenciar perfis</strong><span>Permite alterar permissões de outros usuários.</span></div><input type="checkbox" checked={manageUsers} disabled={isSelf} onChange={(e)=>setManageUsers(e.target.checked)}/></label>}</div>
      <div className="user-permission-footer">{message&&<span className={`user-permission-message ${message==="Acesso atualizado."?"success":"error"}`}>{message==="Acesso atualizado."&&<CheckCircle2 size={15}/>} {message}</span>}<button className="button gold" type="button" disabled={loading} onClick={save}>{loading?<LoaderCircle className="spin" size={17}/>:<Save size={17}/>}Salvar perfil</button></div>
    </div>
  </article>;
}

export function UserPermissionsManager({ users,currentUserId }:{users:UserPermissionRow[];currentUserId:string|null}){
  return <section className="user-permissions-layout">
    <article className="panel sales-profile-template"><div className="panel-body"><div><strong>[Vendas]</strong><span>Perfil Vendas</span><p>Modelo pronto para uma futura conta comercial: consulta preço de venda, estoque e reposição, sem poder alterar dados.</p></div><small>Para virar um login real, basta criar a conta no Authentication e selecionar “Vendas” aqui.</small></div></article>
    <div className="user-permission-list">{users.map((user)=><UserPermissionCard key={user.id} user={user} currentUserId={currentUserId}/>)}</div>
  </section>;
}
