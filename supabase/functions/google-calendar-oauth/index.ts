import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors,
    });
  }

  return new Response(
    JSON.stringify({
      ok: false,
      deprecated: true,
      error:
        "OAuth Google Cloud desativado. A Candinho usa Google Apps Script Bridge para sincronizar o Google Agenda.",
    }),
    {
      status: 410,
      headers: {
        ...cors,
        "content-type":
          "application/json; charset=utf-8",
      },
    },
  );
});
