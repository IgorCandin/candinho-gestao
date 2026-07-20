import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

function reply(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...cors,
        "content-type":
          "application/json; charset=utf-8",
      },
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors,
    });
  }

  if (req.method !== "POST") {
    return reply(
      {
        error:
          "Método não permitido",
      },
      405,
    );
  }

  const url =
    Deno.env.get(
      "SUPABASE_URL",
    );

  const anon =
    Deno.env.get(
      "SUPABASE_ANON_KEY",
    );

  const service =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

  if (
    !url ||
    !anon ||
    !service
  ) {
    return reply(
      {
        error:
          "Configuração interna indisponível",
      },
      503,
    );
  }

  const auth =
    req.headers.get(
      "authorization",
    ) ?? "";

  const user = createClient(
    url,
    anon,
    {
      global: {
        headers: {
          Authorization: auth,
        },
      },
      auth: {
        persistSession: false,
      },
    },
  );

  const admin = createClient(
    url,
    service,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  const {
    data: userData,
    error: authError,
  } = await user.auth.getUser();

  if (
    authError ||
    !userData.user
  ) {
    return reply(
      {
        error:
          "Não autenticado",
      },
      401,
    );
  }

  let body: {
    asset_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return reply(
      {
        error: "JSON inválido",
      },
      400,
    );
  }

  if (!body.asset_id) {
    return reply(
      {
        error:
          "asset_id é obrigatório",
      },
      400,
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await user
    .from("profiles")
    .select(
      "role,active,can_access_supplements,can_access_fitness,can_access_marketing",
    )
    .eq(
      "id",
      userData.user.id,
    )
    .maybeSingle();

  if (
    profileError ||
    !profile?.active
  ) {
    return reply(
      {
        error:
          "Perfil sem acesso",
      },
      403,
    );
  }

  const {
    data: asset,
    error: assetError,
  } = await admin
    .from(
      "central_media_assets",
    )
    .select(
      "id,operation_scope,storage_path,original_filename",
    )
    .eq("id", body.asset_id)
    .maybeSingle();

  if (assetError) {
    return reply(
      {
        error:
          assetError.message,
      },
      500,
    );
  }

  if (!asset) {
    return reply(
      {
        error:
          "Mídia não encontrada",
      },
      404,
    );
  }

  const isAdmin =
    profile.role === "admin";

  const allowed =
    isAdmin ||
    asset.operation_scope ===
      "company" ||
    (asset.operation_scope ===
      "supplements" &&
      profile.can_access_supplements) ||
    (asset.operation_scope ===
      "fitness" &&
      profile.can_access_fitness) ||
    (asset.operation_scope ===
      "marketing" &&
      profile.can_access_marketing);

  if (!allowed) {
    return reply(
      {
        error:
          "Sem permissão para excluir esta mídia",
      },
      403,
    );
  }

  if (asset.storage_path) {
    const {
      error: storageError,
    } = await admin.storage
      .from("central-media")
      .remove([
        asset.storage_path,
      ]);

    if (storageError) {
      console.error(
        "central-media-delete storage",
        storageError.message,
      );

      return reply(
        {
          error:
            "Não foi possível excluir o arquivo do armazenamento",
          detail:
            storageError.message,
        },
        500,
      );
    }
  }

  const {
    error: deleteError,
  } = await admin
    .from(
      "central_media_assets",
    )
    .delete()
    .eq("id", asset.id);

  if (deleteError) {
    console.error(
      "central-media-delete db",
      deleteError.message,
    );

    return reply(
      {
        error:
          "Não foi possível excluir o registro da mídia",
        detail:
          deleteError.message,
      },
      500,
    );
  }

  return reply({
    ok: true,
    deleted_id: asset.id,
    filename:
      asset.original_filename ??
      null,
  });
});
