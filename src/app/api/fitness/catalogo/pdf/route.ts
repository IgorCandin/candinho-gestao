import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument,StandardFonts,rgb,type PDFPage } from "pdf-lib";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime="nodejs";
const W=595.28,H=841.89,M=36;
const BG=rgb(.025,.025,.032),PANEL=rgb(.08,.08,.1),TEXT=rgb(.96,.96,.98),MUTED=rgb(.65,.65,.72),PINK=rgb(.96,.28,.58),LINE=rgb(.2,.2,.24);
const safe=(v:unknown)=>String(v??"").normalize("NFC").replace(/[–—]/g,"-").replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
const money=(v:unknown)=>`R$ ${Number(v??0).toFixed(2).replace(".",",")}`;

export async function GET(request:Request){
 const access=await getCurrentUserAccess();if(!access.canAccessFitness)return NextResponse.json({error:"Acesso negado"},{status:403});
 const url=new URL(request.url);const includeIncoming=url.searchParams.get("incoming")==="1";const selected=(url.searchParams.get("variants")??"").split(",").filter(Boolean);
 const supabase=await createClient();const{data,error}=await supabase.from("fitness_stock_operational").select("*").eq("product_active",true).eq("variant_active",true).order("product_name").order("size").order("color");
 if(error)return NextResponse.json({error:error.message},{status:500});
 let rows=(data??[]) as any[];if(selected.length)rows=rows.filter(r=>selected.includes(r.variant_id));else rows=rows.filter(r=>Number(r.available_quantity)>0||(includeIncoming&&Number(r.incoming_quantity)>0));
 const pdf=await PDFDocument.create();const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);let logo:any=null;try{logo=await pdf.embedPng(await readFile(path.join(process.cwd(),"public","candinho-fitness-logo.png")))}catch{}
 let page:PDFPage=pdf.addPage([W,H]);let y=0;const decoratePage=()=>{page.drawRectangle({x:0,y:0,width:W,height:H,color:BG});page.drawRectangle({x:0,y:0,width:4,height:H,color:PINK});if(logo){const s=Math.min(180/logo.width,48/logo.height);page.drawImage(logo,{x:M,y:H-70,width:logo.width*s,height:logo.height*s})}page.drawText("CATÁLOGO FITNESS",{x:W-M-bold.widthOfTextAtSize("CATÁLOGO FITNESS",10),y:H-50,size:10,font:bold,color:PINK});y=H-105};const newPage=()=>{page=pdf.addPage([W,H]);decoratePage()};
 decoratePage();let lastProduct="";
 for(const row of rows){if(y<75)newPage();if(row.product_name!==lastProduct){if(lastProduct)y-=8;page.drawText(safe(row.product_name),{x:M,y,size:13,font:bold,color:PINK});page.drawLine({start:{x:M,y:y-7},end:{x:W-M,y:y-7},thickness:.5,color:LINE});y-=25;lastProduct=row.product_name}
 page.drawRectangle({x:M,y:y-35,width:W-2*M,height:35,color:PANEL});page.drawText(safe(`${row.size} · ${row.color}`),{x:M+10,y:y-15,size:9,font:bold,color:TEXT});const status=Number(row.available_quantity)>0?`Disponível: ${row.available_quantity}`:`A caminho: ${row.incoming_quantity}`;page.drawText(status,{x:M+10,y:y-29,size:7,font:regular,color:MUTED});const price=money(row.sale_price);page.drawText(price,{x:W-M-10-bold.widthOfTextAtSize(price,10),y:y-22,size:10,font:bold,color:TEXT});y-=40}
 if(!rows.length){page.drawText("Nenhuma peça corresponde aos filtros selecionados.",{x:M,y:H-145,size:11,font:regular,color:MUTED})}
 for(const[p,index]of pdf.getPages().map((p,i)=>[p,i] as const)){p.drawLine({start:{x:M,y:28},end:{x:W-M,y:28},thickness:.5,color:LINE});p.drawText("Candinho Fitness · Consulte disponibilidade no momento do pedido.",{x:M,y:14,size:7,font:regular,color:MUTED});p.drawText(String(index+1),{x:W-M-8,y:14,size:7,font:regular,color:MUTED})}
 const bytes=await pdf.save();return new Response(Buffer.from(bytes),{headers:{"content-type":"application/pdf","content-disposition":"inline; filename=\"catalogo-candinho-fitness.pdf\"","cache-control":"no-store"}});
}
