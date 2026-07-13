import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";

export function GET() {
  return NextResponse.json({ status: "ok", app: "candinho-gestao", database: isSupabaseConfigured ? "configured" : "demo" });
}
