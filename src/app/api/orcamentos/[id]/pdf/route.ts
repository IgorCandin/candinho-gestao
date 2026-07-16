import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const W = 595.28;
const H = 841.89;
const M = 38;
const BG = rgb(0.025, 0.032, 0.045);
const PANEL = rgb(0.055, 0.068, 0.094);
const PANEL_2 = rgb(0.075, 0.088, 0.115);
const LINE = rgb(0.145, 0.165, 0.205);
const TEXT = rgb(0.965, 0.972, 0.985);
const MUTED = rgb(0.62, 0.66, 0.72);
const GOLD = rgb(0.88, 0.68, 0.27);
const GOLD_SOFT = rgb(0.19, 0.145, 0.07);
const GREEN = rgb(0.35, 0.84, 0.55);

function oneRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}
function safe(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25E6]/g, "-")
    .split("")
    .filter((char) => { const code = char.charCodeAt(0); return code === 10 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255); })
    .join("");
}
function money(value: unknown) { return `R$ ${Number(value ?? 0).toFixed(2).replace(".", ",")}`; }
function date(value: unknown) { if (typeof value !== "string" || !value) return "-"; const [y,m,d]=value.slice(0,10).split("-"); return y&&m&&d?`${d}/${m}/${y}`:value; }
function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 4) {
  const words=safe(text).trim().split(/\s+/).filter(Boolean); const lines:string[]=[]; let current="";
  for(const word of words){ const candidate=current?`${current} ${word}`:word; if(font.widthOfTextAtSize(candidate,size)<=maxWidth){current=candidate;continue;} if(current)lines.push(current); current=word; if(lines.length>=maxLines-1)break; }
  if(current&&lines.length<maxLines)lines.push(current);
  if(lines.length===maxLines&&words.join(" ")!==lines.join(" ")){let last=lines[maxLines-1];while(last.length>3&&font.widthOfTextAtSize(`${last}...`,size)>maxWidth)last=last.slice(0,-1);lines[maxLines-1]=`${last}...`;}
  return lines.length?lines:[""];
}

export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}){
  const access=await getCurrentUserAccess();
  if(!access.canAccessSupplements)return NextResponse.json({error:"Acesso negado"},{status:403});
  const {id}=await params; const supabase=await createClient();
  const {data,error}=await supabase.from("sales_quotes").select(`
    id,quote_number,status,quoted_on,valid_until,gross_amount,discount_amount,total_amount,
    gift_quantity,payment_mode,payment_method,payment_due_on,notes,
    customer:customers(name,phone,city,reference),
    gift:products!sales_quotes_gift_product_id_fkey(name),
    items:sales_quote_items(quantity,unit_price,total_price,product:products(name,category))
  `).eq("id",id).maybeSingle();
  if(error)return NextResponse.json({error:error.message},{status:500});
  if(!data)return NextResponse.json({error:"Orçamento não encontrado"},{status:404});

  const row=data as Record<string,unknown>;
  const customer=oneRelation(row.customer); const gift=oneRelation(row.gift);
  const items=Array.isArray(row.items)?row.items as Record<string,unknown>[]:[];
  const pdf=await PDFDocument.create(); const regular=await pdf.embedFont(StandardFonts.Helvetica); const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo:PDFImage|null=null;
  try{const webp=await readFile(path.join(process.cwd(),"public","candinho-suplementos-logo.webp"));logo=await pdf.embedPng(await sharp(webp).png().toBuffer());}catch{logo=null;}

  let page!: PDFPage; let y=0; let pageNo=0;
  function footer(){
    page.drawLine({start:{x:M,y:31},end:{x:W-M,y:31},thickness:.7,color:LINE});
    page.drawText(safe("Candinho Suplementos  |  @candinhosuplementos  |  #VemDeCandin"),{x:M,y:16,size:7.5,font:regular,color:MUTED});
    const p=`${pageNo}`; page.drawText(p,{x:W-M-regular.widthOfTextAtSize(p,7.5),y:16,size:7.5,font:regular,color:MUTED});
  }
  function newPage(continuation=false){
    if(pageNo>0)footer(); page=pdf.addPage([W,H]); pageNo+=1; page.drawRectangle({x:0,y:0,width:W,height:H,color:BG});
    page.drawRectangle({x:0,y:H-112,width:W,height:112,color:rgb(0.02,0.025,0.035)});
    if(logo){const scale=Math.min(190/logo.width,54/logo.height);page.drawImage(logo,{x:M,y:H-82,width:logo.width*scale,height:logo.height*scale});}
    else page.drawText("CANDINHO",{x:M,y:H-70,size:24,font:bold,color:TEXT});
    const badge=`ORÇAMENTO #${String(row.quote_number??"")}`;
    const bw=bold.widthOfTextAtSize(badge,10)+24;
    page.drawRectangle({x:W-M-bw,y:H-74,width:bw,height:30,color:GOLD_SOFT,borderColor:GOLD,borderWidth:.7});
    page.drawText(safe(badge),{x:W-M-bw+12,y:H-64,size:10,font:bold,color:GOLD});
    page.drawText(continuation?"Continuação da proposta":"PROPOSTA COMERCIAL",{x:W-M-170,y:H-94,size:7.5,font:regular,color:MUTED});
    y=H-139;
  }
  function ensure(height:number){if(y-height<58)newPage(true);}
  function sectionTitle(title:string,subtitle?:string){ensure(36);page.drawText(safe(title.toUpperCase()),{x:M,y,size:9,font:bold,color:GOLD});if(subtitle)page.drawText(safe(subtitle),{x:M+bold.widthOfTextAtSize(safe(title.toUpperCase()),9)+10,y,size:8,font:regular,color:MUTED});y-=18;}
  function infoBox(x:number,top:number,width:number,label:string,value:string,accent=false){page.drawRectangle({x,y:top-48,width,height:48,color:PANEL,borderColor:accent?GOLD:LINE,borderWidth:.7});page.drawText(safe(label.toUpperCase()),{x:x+12,y:top-17,size:6.8,font:bold,color:MUTED});page.drawText(safe(value),{x:x+12,y:top-35,size:10,font:bold,color:accent?GOLD:TEXT});}

  newPage(false);
  const name=safe(customer?.name??"Cliente não informado");
  page.drawText("PREPARADO PARA",{x:M,y,size:7,font:bold,color:MUTED}); y-=20;
  page.drawText(name,{x:M,y,size:20,font:bold,color:TEXT});
  const city=[customer?.city,customer?.reference].filter(Boolean).map(safe).join(" · "); if(city)page.drawText(city,{x:M,y:y-17,size:8.5,font:regular,color:MUTED});
  if(typeof customer?.phone==="string"&&customer.phone)page.drawText(safe(customer.phone),{x:W-M-regular.widthOfTextAtSize(safe(customer.phone),9),y,size:9,font:regular,color:MUTED});
  y-=50;
  const gap=10; const boxW=(W-M*2-gap*2)/3; const top=y;
  infoBox(M,top,boxW,"Data do orçamento",date(row.quoted_on)); infoBox(M+boxW+gap,top,boxW,"Válido até",date(row.valid_until),true); infoBox(M+(boxW+gap)*2,top,boxW,"Situação",String(row.status)==="confirmed"?"Confirmado":"Cotação");
  y-=72;

  sectionTitle("Produtos","Itens incluídos nesta proposta");
  for(const [index,item] of items.entries()){
    const product=oneRelation(item.product); const productName=safe(product?.name??"Produto"); const category=safe(product?.category??""); const qty=Number(item.quantity??0); const unit=Number(item.unit_price??0); const total=Number(item.total_price??qty*unit);
    const h=66; ensure(h+10);
    page.drawRectangle({x:M,y:y-h+6,width:W-M*2,height:h,color:PANEL,borderColor:LINE,borderWidth:.65});
    page.drawRectangle({x:M+10,y:y-45,width:36,height:36,color:PANEL_2,borderColor:LINE,borderWidth:.5});
    const idx=String(index+1).padStart(2,"0"); page.drawText(idx,{x:M+20,y:y-34,size:11,font:bold,color:GOLD});
    wrap(productName,bold,10.5,260,2).forEach((line,i)=>page.drawText(line,{x:M+58,y:y-18-i*13,size:10.5,font:bold,color:TEXT}));
    if(category)page.drawText(category,{x:M+58,y:y-49,size:7.5,font:regular,color:MUTED});
    page.drawText(`Qtd. ${qty}`,{x:W-M-190,y:y-18,size:7.5,font:regular,color:MUTED}); page.drawText(money(unit),{x:W-M-190,y:y-35,size:9,font:bold,color:TEXT});
    const totalText=money(total); page.drawText(totalText,{x:W-M-bold.widthOfTextAtSize(totalText,11),y:y-34,size:11,font:bold,color:GOLD});
    y-=h+8;
  }

  ensure(125); y-=4;
  const summaryH=104; page.drawRectangle({x:M,y:y-summaryH+6,width:W-M*2,height:summaryH,color:rgb(.04,.05,.068),borderColor:GOLD,borderWidth:.8});
  page.drawText("RESUMO",{x:M+16,y:y-16,size:7,font:bold,color:MUTED});
  page.drawText("Subtotal",{x:M+16,y:y-39,size:8.5,font:regular,color:MUTED}); page.drawText(money(row.gross_amount),{x:M+128,y:y-39,size:9,font:bold,color:TEXT});
  const discount=Number(row.discount_amount??0); if(discount>0){page.drawText("Desconto",{x:M+16,y:y-58,size:8.5,font:regular,color:MUTED});page.drawText(`- ${money(discount)}`,{x:M+128,y:y-58,size:9,font:bold,color:GREEN});}
  page.drawText("TOTAL FINAL",{x:W-M-190,y:y-24,size:7,font:bold,color:MUTED}); const finalText=money(row.total_amount); page.drawText(finalText,{x:W-M-bold.widthOfTextAtSize(finalText,22),y:y-55,size:22,font:bold,color:GOLD});
  y-=summaryH+14;

  sectionTitle("Condições","Pagamento, brinde e observações");
  const paymentMode=String(row.payment_mode??"receivable");
  const paymentCondition=paymentMode==="paid"?"Pago":paymentMode==="combined"?`Combinado para ${date(row.payment_due_on)}`:"A receber";
  const detailTop=y; const detailW=(W-M*2-gap)/2;
  infoBox(M,detailTop,detailW,"Forma de pagamento",typeof row.payment_method==="string"&&row.payment_method?row.payment_method:"Não informada");
  infoBox(M+detailW+gap,detailTop,detailW,"Condição",paymentCondition);
  y-=62;
  if(gift&&Number(row.gift_quantity??0)>0){ensure(54);page.drawRectangle({x:M,y:y-42,width:W-M*2,height:42,color:GOLD_SOFT,borderColor:GOLD,borderWidth:.6});page.drawText("BRINDE INCLUSO",{x:M+12,y:y-16,size:7,font:bold,color:GOLD});page.drawText(safe(`${String(gift.name)}${Number(row.gift_quantity)>1?` · ${Number(row.gift_quantity)} un.`:""}`),{x:M+12,y:y-32,size:9.5,font:bold,color:TEXT});y-=54;}
  if(typeof row.notes==="string"&&row.notes.trim()){
    const lines=wrap(row.notes,regular,8.5,W-M*2-24,8); const h=34+lines.length*12; ensure(h+10); page.drawRectangle({x:M,y:y-h+8,width:W-M*2,height:h,color:PANEL,borderColor:LINE,borderWidth:.6}); page.drawText("OBSERVAÇÕES",{x:M+12,y:y-15,size:7,font:bold,color:MUTED}); lines.forEach((line,i)=>page.drawText(line,{x:M+12,y:y-32-i*12,size:8.5,font:regular,color:TEXT})); y-=h+10;
  }

  ensure(62); page.drawText("Obrigado pela preferência.",{x:M,y:y-8,size:12,font:bold,color:TEXT});page.drawText("Qualidade que entrega resultado.",{x:M,y:y-27,size:9,font:regular,color:GOLD});
  footer();

  const bytes=await pdf.save();
  return new NextResponse(Buffer.from(bytes),{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="orcamento-candinho-${String(row.quote_number??id)}.pdf"`,"Cache-Control":"private, no-store"}});
}
