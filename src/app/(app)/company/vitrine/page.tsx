import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Gift, MessageSquareQuote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/data";

async function createTestimonial(formData: FormData) { "use server";
  const access=await getCurrentUserAccess(); if(!access.canManageUsers) return;
  const supabase=await createClient(); await supabase.from("storefront_testimonials").insert({customer_name:String(formData.get("name")||"").trim(),comment:String(formData.get("comment")||"").trim(),profession:String(formData.get("profession")||"").trim()||null,photo_url:String(formData.get("photo_url")||"").trim()||null,active:formData.get("active")==="on"}); revalidatePath("/company/vitrine"); revalidatePath("/catalogo");
}
async function setTestimonialState(formData: FormData) { "use server";
  const access=await getCurrentUserAccess(); if(!access.canManageUsers) return;
  const supabase=await createClient(); await supabase.from("storefront_testimonials").update({active:formData.get("active")==="true",updated_at:new Date().toISOString()}).eq("id",String(formData.get("id"))); revalidatePath("/company/vitrine"); revalidatePath("/catalogo");
}
async function setCouponState(formData: FormData) { "use server";
  const access=await getCurrentUserAccess(); if(!access.canManageUsers) return;
  const supabase=await createClient(); const status=String(formData.get("status")); await supabase.from("storefront_coupon_signups").update({status,used_at:status==="used"?new Date().toISOString():null}).eq("id",String(formData.get("id"))); revalidatePath("/company/vitrine");
}

export default async function CompanyStorefrontManagementPage(){
  const access=await getCurrentUserAccess(); if(!access.canManageUsers) redirect("/company/inicio");
  const supabase=await createClient(); const [{data:testimonials},{data:coupons}]=await Promise.all([supabase.from("storefront_testimonials").select("*").order("created_at",{ascending:false}),supabase.from("storefront_coupon_signups").select("*").order("created_at",{ascending:false})]);
  return <div className="company-workspace-v2"><header className="company-workspace-head"><div><span>VITRINE · GESTÃO</span><h1>Clientes, depoimentos e cupons</h1><p>O que o cliente vê e os cadastros gerados pela campanha ficam reunidos aqui.</p></div></header>
    <article className="panel"><div className="panel-head"><div><h2><MessageSquareQuote/> Novo depoimento</h2><p>Publique somente relatos reais autorizados pelo cliente.</p></div></div><form action={createTestimonial} className="company-storefront-form"><input name="name" placeholder="Nome do cliente" required/><input name="profession" placeholder="Profissão/função (opcional)"/><input name="photo_url" placeholder="Link da foto (opcional)"/><textarea name="comment" placeholder="Comentário" required/><label><input type="checkbox" name="active"/> Publicar agora</label><button className="button gold">Salvar depoimento</button></form>
    <div className="company-storefront-list">{(testimonials||[]).map((item)=><div key={item.id}><div><strong>{item.customer_name}</strong><p>{item.comment}</p></div><form action={setTestimonialState}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="active" value={item.active?"false":"true"}/><button>{item.active?"Ocultar":"Publicar"}</button></form></div>)}</div></article>
    <article className="panel"><div className="panel-head"><div><h2><Gift/> Cupons da primeira compra</h2><p>Valide, marque como usado ou cancele sem perder o histórico do consentimento.</p></div><strong>{coupons?.length||0}</strong></div><div className="company-storefront-list">{(coupons||[]).map((item)=><div key={item.id}><div><strong>{item.customer_name} · {item.coupon_code}</strong><p>{item.email||item.phone} · Canais: {[item.consent_whatsapp&&"WhatsApp",item.consent_email&&"e-mail",item.consent_sms&&"SMS"].filter(Boolean).join(", ")} · {item.status}</p></div><form action={setCouponState}><input type="hidden" name="id" value={item.id}/><button name="status" value="used">Usado</button><button name="status" value="cancelled">Cancelar</button></form></div>)}</div></article>
  </div>;
}
