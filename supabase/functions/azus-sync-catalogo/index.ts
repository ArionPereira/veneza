// Edge Function: azus-sync-catalogo
// Lê o catálogo público da Azus no Canva, compara com o que está em
// azus_produtos/azus_produto_cores e aplica as diferenças (preço, cores,
// descrição, produto novo/descontinuado) direto no banco.
//
// NÃO mexe em fotos (azus_produto_fotos) de propósito — escolher qual
// foto representa um produto novo exige julgamento visual, então isso
// continua manual (scripts/seed-azus-fotos.mjs).
//
// Como o Canva não tem API oficial, isso lê um JSON interno que a própria
// página carrega para renderizar (window.bootstrap) — não documentado,
// pode quebrar se a Canva mudar o formato da página um dia. Se a leitura
// falhar, a function reporta erro em azus_sync_log e NÃO mexe no banco
// (falha "seca": nunca aplica dado parcial/quebrado no catálogo ao vivo).
//
// Chamada por:
//   - GitHub Actions 1x por dia (.github/workflows/azus-sync-diario.yml),
//     autenticado com a secret AZUS_SYNC_KEY.
//   - Botão "Atualizar agora" no painel interno Pedidos Azus, autenticado
//     com usuário/senha do Hub (mesmo mecanismo de azus-pedidos).
//
// Deploy:
//   supabase secrets set AZUS_SYNC_KEY=<uma string aleatória sua>
//   supabase functions deploy azus-sync-catalogo --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const CATALOGO_URL = "https://catalogosazus.my.canva.site/alfaiatariasazus3/";

// ---------------------------------------------------------------------
// Extrai o JSON interno (window['bootstrap'] = JSON.parse('...')) do HTML
// da página. É uma string JS de aspas simples; só \' precisa ser
// desescapado (o resto — \n, acentos — já vem pronto pro JSON.parse).
// ---------------------------------------------------------------------
function extrairBootstrap(html: string): any {
  const marcador = "window['bootstrap'] = JSON.parse('";
  const inicio = html.indexOf(marcador);
  if (inicio === -1) throw new Error("Não achei o bloco 'bootstrap' no HTML do catálogo (a Canva pode ter mudado o formato da página).");
  let i = inicio + marcador.length;
  let bruto = "";
  while (i < html.length) {
    const ch = html[i];
    if (ch === "\\") { bruto += html[i] + html[i + 1]; i += 2; continue; }
    if (ch === "'") break;
    bruto += ch; i++;
  }
  const semEscapeDeAspas = bruto.replace(/\\'/g, "'");
  return JSON.parse(semEscapeDeAspas);
}

function coletarStrings(o: any, out: string[]) {
  if (o == null) return;
  if (typeof o === "string") { out.push(o); return; }
  if (Array.isArray(o)) { for (const v of o) coletarStrings(v, out); return; }
  if (typeof o === "object") { for (const k in o) coletarStrings(o[k], out); return; }
}

// O texto de dentro do design da Canva grava quebra de linha como o
// marcador literal "\n" (2 caracteres), n\u00e3o como caractere de nova linha
// de verdade \u2014 precisa converter antes de usar (ex.: pra separar as
// linhas do bloco de cores).
function limpar(s: string): string {
  return s.replace(/\\n/g, "\n").trim();
}

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// O r\u00f3tulo curto da p\u00e1gina no Canva (ex.: "LISBOA") \u00e0s vezes \u00e9 mais curto
// que o nome cadastrado no cat\u00e1logo (ex.: "Gurkha Lisboa") \u2014 considera
// como o mesmo produto se um nome "cont\u00e9m" o outro, n\u00e3o s\u00f3 se forem iguais.
function mesmoProduto(a: string, b: string): boolean {
  const na = normalizar(a), nb = normalizar(b);
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

function slugify(nome: string): string {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------
// Parseia o bloco "cores/TAMANHO/ENTREGA\n01. branco 38-52 imediato\n..."
// em linhas estruturadas.
// ---------------------------------------------------------------------
function parseCores(raw: string) {
  const linhas = limpar(raw).split("\n").map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith("cores/"));
  const linhaRe = /^(\d{2})\.\s*(.*)$/;
  const tamanhoRe = /(\d{2})\s*-\s*(\d{2})/;
  const rows: { codigo: string; nome: string; tamanho_min: number | null; tamanho_max: number | null; entrega: string | null }[] = [];
  for (const l of linhas) {
    const m = l.match(linhaRe);
    if (!m) continue;
    const codigo = m[1];
    const resto = m[2];
    const tm = resto.match(tamanhoRe);
    let nome: string, tmin: number | null = null, tmax: number | null = null, entrega = "";
    if (tm && tm.index != null) {
      nome = resto.slice(0, tm.index).trim();
      tmin = parseInt(tm[1], 10); tmax = parseInt(tm[2], 10);
      entrega = resto.slice(tm.index + tm[0].length).trim();
    } else {
      const dm = resto.match(/\d/);
      if (dm && dm.index != null) {
        nome = resto.slice(0, dm.index).trim();
        entrega = resto.slice(dm.index).trim();
      } else {
        nome = resto.trim();
      }
    }
    rows.push({ codigo, nome: nome.toLowerCase().trim(), tamanho_min: tmin, tamanho_max: tmax, entrega: entrega || null });
  }
  return rows;
}

const PRECO_RE = /[Rr]\$\s*[\d.,]+/;

function extrairProdutosDoCatalogo(bootstrap: any) {
  const paginas = bootstrap?.page?.A?.A;
  if (!Array.isArray(paginas)) throw new Error("Formato inesperado: page.A.A não é uma lista de páginas.");

  const produtos: any[] = [];
  paginas.forEach((pagina: any, idx: number) => {
    const strings: string[] = [];
    coletarStrings(pagina, strings);
    const temPreco = strings.some(s => PRECO_RE.test(s));
    if (!temPreco) return; // página de índice/menu, não é produto

    const nome = (pagina.B || "").trim();
    if (!nome) return;

    const descricaoStr = strings
      .filter(s => s.trim().length > 80 && !s.toLowerCase().startsWith("cores/") && !s.toLowerCase().startsWith("composiç"))
      .sort((a, b) => b.length - a.length)[0];
    const descricao = descricaoStr ? limpar(descricaoStr) : null;

    const composicaoStr = strings.find(s => s.toLowerCase().startsWith("composiç"));
    const composicao = composicaoStr ? limpar(composicaoStr).replace(/composiç[aã]o:\s*/i, "").trim() : null;

    const precoAtacadoStr = strings.find(s => /compra livre/i.test(s));
    let precoVarejo: number | null = null;
    let precoAtacado: { min: number; preco: number }[] | null = null;
    if (precoAtacadoStr) {
      const faixas: { min: number; preco: number }[] = [];
      const re = /(compra livre|\+\s*(\d+)\s*pe[çc]as)\D{0,10}[Rr]\$\s*([\d.,]+)/gi;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(precoAtacadoStr))) {
        const min = mm[2] ? parseInt(mm[2], 10) : 1;
        const preco = parseFloat(mm[3].replace(".", "").replace(",", "."));
        faixas.push({ min, preco });
      }
      if (faixas.length) precoAtacado = faixas;
    } else {
      const precoStr = strings.find(s => PRECO_RE.test(s));
      const m = precoStr?.match(/[\d.,]+/);
      if (m) precoVarejo = parseFloat(m[0].replace(".", "").replace(",", "."));
    }

    const producaoLimitadaStr = strings.find(s => /produ[çc][aã]o limitada/i.test(s));

    const coresRaw = strings.filter(s => s.toLowerCase().startsWith("cores/"));
    const cores = coresRaw.flatMap(parseCores);

    produtos.push({
      nome,
      descricao,
      composicao,
      preco_varejo: precoVarejo,
      preco_atacado: precoAtacado,
      producao_limitada: producaoLimitadaStr ? limpar(producaoLimitadaStr) : null,
      cores,
      ordem: idx,
    });
  });
  return produtos;
}

// ---------------------------------------------------------------------
async function sincronizar(admin: ReturnType<typeof createClient>, origem: string) {
  const resp = await fetch(CATALOGO_URL, { headers: { "User-Agent": "Mozilla/5.0 (compatible; AzusCatalogSync/1.0)" } });
  if (!resp.ok) throw new Error("Catálogo Canva respondeu HTTP " + resp.status);
  const html = await resp.text();
  const bootstrap = extrairBootstrap(html);
  const produtosVivos = extrairProdutosDoCatalogo(bootstrap);
  if (produtosVivos.length === 0) throw new Error("Nenhum produto encontrado no catálogo — abortando pra não zerar a loja por engano.");

  const { data: existentes, error: errExist } = await admin.from("azus_produtos").select("id, slug, nome, preco_varejo, ativo");
  if (errExist) throw errExist;

  // Casa pelo nome (não pelo slug): o rótulo curto da página Canva
  // (ex.: "LISBOA") pode ser mais curto que o nome cadastrado (ex.:
  // "Gurkha Lisboa") — ver mesmoProduto(). Cada produto existente só
  // pode ser usado uma vez por rodada.
  const restantes = new Set(existentes || []);
  const acharExistente = (nome: string) => {
    for (const e of restantes) if (mesmoProduto(e.nome, nome)) return e;
    return null;
  };

  const novos: string[] = [];
  const precosAlterados: { nome: string; antes: number | null; depois: number | null }[] = [];

  for (const p of produtosVivos) {
    const existente = acharExistente(p.nome);
    if (existente) {
      restantes.delete(existente);
      if ((existente.preco_varejo ?? null) !== (p.preco_varejo ?? null)) {
        precosAlterados.push({ nome: p.nome, antes: existente.preco_varejo, depois: p.preco_varejo });
      }
      const { error } = await admin.from("azus_produtos").update({
        descricao: p.descricao, composicao: p.composicao, preco_varejo: p.preco_varejo,
        preco_atacado: p.preco_atacado, producao_limitada: p.producao_limitada, ordem: p.ordem, ativo: true,
      }).eq("id", existente.id);
      if (error) throw error;
      await admin.from("azus_produto_cores").delete().eq("produto_id", existente.id);
      if (p.cores.length) {
        const { error: errCores } = await admin.from("azus_produto_cores").insert(
          p.cores.map((c: any, i: number) => ({ produto_id: existente.id, ...c, ordem: i + 1 }))
        );
        if (errCores) throw errCores;
      }
    } else {
      novos.push(p.nome);
      const { data: inserido, error } = await admin.from("azus_produtos").insert({
        slug: slugify(p.nome), nome: p.nome, descricao: p.descricao, composicao: p.composicao,
        preco_varejo: p.preco_varejo, preco_atacado: p.preco_atacado, producao_limitada: p.producao_limitada,
        ordem: p.ordem, ativo: true,
      }).select().single();
      if (error) throw error;
      if (p.cores.length) {
        const { error: errCores } = await admin.from("azus_produto_cores").insert(
          p.cores.map((c: any, i: number) => ({ produto_id: inserido.id, ...c, ordem: i + 1 }))
        );
        if (errCores) throw errCores;
      }
    }
  }

  const desativados: string[] = [];
  for (const existente of restantes) {
    if (existente.ativo) {
      desativados.push(existente.nome);
      const { error } = await admin.from("azus_produtos").update({ ativo: false }).eq("id", existente.id);
      if (error) throw error;
    }
  }

  const partes: string[] = [];
  if (novos.length) partes.push(novos.length + " produto(s) novo(s): " + novos.join(", "));
  if (precosAlterados.length) partes.push(precosAlterados.length + " preço(s) alterado(s): " + precosAlterados.map(p => p.nome + " " + (p.antes ?? "—") + "→" + (p.depois ?? "—")).join(", "));
  if (desativados.length) partes.push(desativados.length + " produto(s) descontinuado(s): " + desativados.join(", "));
  const resumo = partes.length ? partes.join(" · ") : "Sem mudanças desde a última sincronização.";

  await admin.from("azus_sync_log").insert({
    ok: true, resumo, origem,
    detalhes: { novos, precos_alterados: precosAlterados, desativados, total_produtos_lidos: produtosVivos.length },
  });

  return { resumo, novos, precosAlterados, desativados };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ erro: "Function sem SUPABASE_URL/SERVICE_ROLE_KEY." }, 500);
    const admin = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { chave_cron, usuario, senha } = body || {};

    let origem: string | null = null;
    const chaveEsperada = Deno.env.get("AZUS_SYNC_KEY");
    if (chaveEsperada && chave_cron === chaveEsperada) {
      origem = "cron";
    } else if (usuario && senha) {
      const { data: login } = await admin.rpc("app_login", { p_usuario: usuario, p_senha: senha });
      const sessao = Array.isArray(login) ? login[0] : login;
      const liberado = sessao && (sessao.role === "master" || (sessao.modulos || []).includes("pedidos-azus"));
      if (liberado) origem = "manual";
    }
    if (!origem) return json({ erro: "Não autorizado." }, 401);

    try {
      const resultado = await sincronizar(admin, origem);
      return json(resultado);
    } catch (e) {
      await admin.from("azus_sync_log").insert({ ok: false, resumo: "Falhou: " + String((e as Error)?.message || e), origem, detalhes: { erro: String((e as Error)?.message || e) } });
      throw e;
    }
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
