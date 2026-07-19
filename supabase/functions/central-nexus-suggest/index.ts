import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() =>
  new Response(
    JSON.stringify({
      ok: false,
      paused: true,
      error: "Nexus de Atendimento está pausado enquanto a Inbox da Central estiver desativada.",
    }),
    {
      status: 410,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  )
);
