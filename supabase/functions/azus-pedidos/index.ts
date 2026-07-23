// Edge Function: azus-pedidos
// Lê/atualiza os pré-pedidos da Loja Azus para a tela interna "Pedidos Azus".
//
// Por quê uma function em vez de ler a tabela azus_pedidos direto do client:
// azus_pedidos/azus_pedido_itens têm nome/telefone de cliente, e a Loja Azus
// é pública (qualquer visitante tem a mesma chave anon do bundle). Por isso
// o anon só pode INSERIR pedido (via RPC azus_criar_pedido), nunca ler — e
// esta function usa a service-role key (nunca exposta ao navegador) para
// listar/atualizar, depois de reconferir a senha do usuário a cada chamada
// contra public.app_usuarios (mesmo mecanismo do login do Hub, via
// app_login — sem isso, qualquer um com a chave anon do bundle público
// conseguiria ver todos os pedidos).
//
// Deploy:
//   supabase functions deploy azus-pedidos --no-verify-jwt
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por padrão em toda
//  Edge Function do projeto — não precisa cadastrar nada a mais.)

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ erro: "Function sem SUPABASE_URL/SERVICE_ROLE_KEY." }, 500);
    const admin = createClient(url, serviceKey);

    const body = await req.json();
    const { usuario, senha, action } = body || {};
    if (!usuario || !senha) return json({ erro: "Informe usuário e senha." }, 401);

    // Reconfere as credenciais a cada chamada (mesma função do login do Hub).
    const { data: login, error: loginErr } = await admin.rpc("app_login", { p_usuario: usuario, p_senha: senha });
    const sessao = Array.isArray(login) ? login[0] : login;
    if (loginErr || !sessao) return json({ erro: "Usuário ou senha inválidos." }, 401);
    const liberado = sessao.role === "master" || (sessao.modulos || []).includes("pedidos-azus");
    if (!liberado) return json({ erro: "Sem acesso ao módulo Pedidos Azus." }, 403);

    if (action === "listar") {
      const { data: pedidos, error } = await admin
        .from("azus_pedidos")
        .select("*, itens:azus_pedido_itens(*)")
        .order("criado_em", { ascending: false });
      if (error) return json({ erro: error.message }, 500);
      return json({ pedidos });
    }

    if (action === "atualizar_status") {
      const { id, status } = body;
      if (!id || !["novo", "lancado", "cancelado"].includes(status)) return json({ erro: "Dados inválidos." }, 400);
      const { error } = await admin.from("azus_pedidos").update({ status }).eq("id", id);
      if (error) return json({ erro: error.message }, 500);
      return json({ ok: true });
    }

    return json({ erro: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
