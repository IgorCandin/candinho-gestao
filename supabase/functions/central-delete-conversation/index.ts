import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const headers = { "content-type": "application/json; charset=utf-8" };

Deno.serve(async () => {
  return new Response(
    JSON.stringify({
      error: "Endpoint encerrado: a Inbox da Candinho Central está pausada.",
      code: "INBOX_PAUSED",
    }),
    { status: 410, headers },
  );
});
