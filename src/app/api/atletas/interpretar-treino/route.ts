import { POST as interpretPhysiqueTraining } from "@/app/api/physique/interpretar-treino/route";

export const runtime = "nodejs";
export const maxDuration = 60;

// Compatibilidade para abas antigas que ainda tenham o endereço anterior em cache.
// A implementação oficial permanece em /api/physique/interpretar-treino.
export async function POST(request: Request) {
  return interpretPhysiqueTraining(request);
}
