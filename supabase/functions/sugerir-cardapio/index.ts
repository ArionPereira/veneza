// Edge Function: sugerir-cardapio
// Recebe o catálogo de pratos (com custo), o estoque, o período e as regras,
// e usa a API da DeepSeek para montar/reequilibrar um cardápio.
// A chave da DeepSeek fica como SECRET no Supabase (nunca vai pro front-end).
//
// Deploy:
//   supabase secrets set DEEPSEEK_API_KEY=sk-...        (sua chave DeepSeek)
//   supabase functions deploy sugerir-cardapio --no-verify-jwt
//
// (ou cole este arquivo no editor de Functions do painel do Supabase e
//  cadastre o secret DEEPSEEK_API_KEY em Settings → Edge Functions.)

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
    const key = Deno.env.get("DEEPSEEK_API_KEY");
    if (!key) return json({ erro: "DEEPSEEK_API_KEY não configurada no Supabase" }, 500);

    const body = await req.json();
    const { pratos = [], estoque = [], datas = [], refeicoes = [], pessoas = 100, plano_refeicao = {}, regras = {}, proposta_local = {} } = body || {};
    if (!pratos.length || !datas.length || !refeicoes.length) return json({ erro: "Dados insuficientes (pratos/datas/refeições)." }, 400);

    const sys = [
      "Você é um nutricionista de refeitório industrial no Brasil.",
      "Monte um cardápio escolhendo pratos APENAS do catálogo fornecido (use os campos id).",
      "REGRA DE ESTRUTURA (obrigatória por refeição, siga o campo plano_refeicao):",
      "  - 'Proteína': escolha EXATAMENTE 1 prato dessa categoria por refeição.",
      "  - 'Base': inclua TODAS as bases ativas (arroz, feijão etc.); elas repetem em toda refeição.",
      "  - 'Guarnição': escolha o número informado (1 ou 2) por refeição.",
      "  - 'Salada': escolha o número informado (1 ou 2) por refeição.",
      "  - 'Sobremesa'/'Bebida': se pedidas, escolha 1 por refeição; se não, não inclua.",
      "Cada prato tem um campo 'refeicoes': se for uma lista de ids (ex.: [\"cafe\"]), o prato SÓ PODE ser usado nessas refeições; se for a string \"todas\", pode ser usado em qualquer refeição pedida. NUNCA coloque um prato marcado para 'cafe' (café da manhã) no almoço ou na janta, e vice-versa.",
      "NUNCA misture categorias (proteína no lugar de guarnição, salada no lugar de proteína etc.). Respeite estritamente o campo 'categoria' de cada prato.",
      "Regras de preferência: se priorizar_custo, prefira pratos de menor custo; se priorizar_estoque, prefira pratos cujos ingredientes estejam no estoque; evite repetir o mesmo prato dentro de nao_repetir_dias (exceto a categoria 'Base', que sempre repete); varie as proteínas entre os dias.",
      "Responda ESTRITAMENTE em JSON no formato: {\"plano\": {\"YYYY-MM-DD\": {\"refId\": [\"pratoId\", ...] } } }. Sem texto fora do JSON.",
    ].join(" ");

    const user = JSON.stringify({ catalogo_pratos: pratos, estoque, pessoas, datas, refeicoes, plano_refeicao, regras, proposta_local });

    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: "deepseek-v4-flash", // rápido/barato; troque por "deepseek-v4-pro" se quiser o modelo maior
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      }),
    });
    if (!resp.ok) return json({ erro: "DeepSeek: erro " + resp.status + " " + (await resp.text()).slice(0, 200) }, 502);

    const data = await resp.json();
    const conteudo = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(conteudo); } catch { return json({ erro: "Resposta da IA não veio em JSON válido." }, 502); }
    const plano = parsed.plano || parsed;
    if (!plano || typeof plano !== "object") return json({ erro: "IA não retornou um plano válido." }, 502);
    return json({ plano });
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
