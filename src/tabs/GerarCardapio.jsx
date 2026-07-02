import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH, SH2, brl, num, fatorUnidade } from "../constants.js";
import { hojeISO, addDias, fromISO, fmtData, intervalo, NOMES } from "../dates.js";

// ---------------------------------------------------------------------------
// Motor LOCAL de geração de cardápio (puro JS, sem IA).
// Estrutura de refeição:
//   Proteína : exatamente 1
//   Base     : TODAS (arroz + feijão sempre)
//   Guarnição: 1 ou 2 (configurável)
//   Salada   : 1 ou 2 (configurável)
//   Sobremesa: 0 ou 1 (opcional)
//   Bebida   : 0 ou 1 (opcional)
// Prioriza menor custo e o que já tem em estoque, evita repetir dentro da
// janela "não repetir por N dias", respeita a marcação "serve em quais
// refeições" (pão só no café da manhã) e desconta do estoque o que os dias
// JÁ agendados vão consumir, pra não prometer o mesmo insumo duas vezes.
// ---------------------------------------------------------------------------

// quantidade necessária de cada insumo (na unidade do insumo) p/ servir `pessoas`
function necessidade(prato, insumoMap, pessoas) {
  const m = {};
  (prato?.ficha || []).forEach(l => {
    const i = insumoMap[l.insumoId]; if (!i) return;
    const q = (Number(l.g) || 0) * pessoas / fatorUnidade(i.unidade) * (Number(i.fc) || 1);
    m[l.insumoId] = (m[l.insumoId] || 0) + q;
  });
  return m;
}
function cobertura(prato, insumoMap, pessoas, estoqueRest) {
  const need = necessidade(prato, insumoMap, pessoas);
  const ids = Object.keys(need); if (!ids.length) return 0;
  let ok = 0; ids.forEach(id => { if ((estoqueRest[id] || 0) >= need[id]) ok++; });
  return ok / ids.length;
}
function serveRefeicao(prato, refId) {
  const rs = prato.refeicoes;
  return !rs || !rs.length || rs.includes(refId);
}
function consomeEstoque(prato, insumoMap, pessoas, estoqueRest) {
  const need = necessidade(prato, insumoMap, pessoas);
  Object.keys(need).forEach(id => { estoqueRest[id] = Math.max(0, (estoqueRest[id] || 0) - need[id]); });
}

// desconta do estoque tudo que os dias JÁ agendados (fora os que serão
// sobrescritos por esta geração) vão consumir
function estoqueComprometido(estoque, cardapio, pratoMap, insumoMap, datasGeradas, sobrescrever) {
  const rest = { ...(estoque || {}) };
  const hoje = hojeISO();
  const seraSobrescrito = new Set(sobrescrever ? datasGeradas : []);
  Object.keys(cardapio || {}).forEach(data => {
    if (data < hoje) return;
    if (seraSobrescrito.has(data)) return;
    const dia = cardapio[data] || {};
    Object.keys(dia).forEach(refId => {
      const r = dia[refId];
      (r?.pratos || []).forEach(id => consomeEstoque(pratoMap[id], insumoMap, r.previsto || 0, rest));
    });
  });
  return rest;
}

// escolhe o "melhor" prato de uma lista, com pesos de custo, estoque e não-repetição
function escolherMelhor(cands, catMaxCusto, custoPrato, insumoMap, pessoas, estoqueRest, wCusto, wEstoque) {
  let melhor = null, melhorSc = -Infinity;
  cands.forEach(p => {
    const custoN = custoPrato(p) / (catMaxCusto || 1);
    const cob = cobertura(p, insumoMap, pessoas, estoqueRest);
    const sc = wCusto * (1 - custoN) + wEstoque * cob + 0.12 * Math.random();
    if (sc > melhorSc) { melhorSc = sc; melhor = p; }
  });
  return melhor;
}

// ordem fixa das categorias no plano de refeição
const ORDEM_CAT = ["Proteína", "Base", "Guarnição", "Salada", "Sobremesa", "Bebida"];

export function gerarCardapioLocal({ pratos, custoPrato, insumoMap, pratoMap, estoque, cardapio, datas, refeicoes, planoRef, pessoas, opts }) {
  const naoRepetir = Math.max(0, Number(opts?.naoRepetir ?? 3));
  const wCusto   = opts?.priorizarCusto   ? 1 : 0;
  const wEstoque = opts?.priorizarEstoque ? 1 : 0;
  const repetirJanta = !!opts?.repetirJantaNoAlmoco;
  const estoqueRest = estoqueComprometido(estoque, cardapio, pratoMap || {}, insumoMap, datas, opts?.sobrescrever);
  const usadoEm = {}; // pratoId -> índice do último dia usado

  // custo máximo por categoria (p/ normalizar o score)
  const catMax = {};
  ORDEM_CAT.forEach(cat => {
    const cs = pratos.filter(p => p.categoria === cat).map(p => custoPrato(p));
    catMax[cat] = Math.max(1e-6, ...cs, 1e-6);
  });

  const plano = {};
  let custoTotal = 0, instTotal = 0, instCobertas = 0;

  datas.forEach((data, di) => {
    const dia = {};
    refeicoes.forEach(ref => {
      if (repetirJanta && ref.id === "janta") return; // jantar espelha o almoço depois
      const escolhidos = [];
      const jaEscolhidos = new Set();

      ORDEM_CAT.forEach(cat => {
        const cfg = planoRef[cat]; if (!cfg || cfg.qtd === 0) return;
        const elegiveis = pratos.filter(p => p.categoria === cat && serveRefeicao(p, ref.id));
        if (!elegiveis.length) return;

        // Base: pega TODAS (arroz + feijão são fixos toda refeição)
        if (cat === "Base") {
          elegiveis.forEach(p => {
            if (jaEscolhidos.has(p.id)) return;
            const cobAntes = cobertura(p, insumoMap, pessoas, estoqueRest);
            instTotal++; if (cobAntes >= 0.999) instCobertas++;
            consomeEstoque(p, insumoMap, pessoas, estoqueRest);
            escolhidos.push(p.id); jaEscolhidos.add(p.id);
            custoTotal += custoPrato(p) * pessoas;
          });
          return;
        }

        // Demais categorias: escolhe até cfg.qtd, com preferência p/ fora da janela de repetição
        const alvo = Math.max(1, Number(cfg.qtd) || 1);
        for (let i = 0; i < alvo; i++) {
          let cands = elegiveis.filter(p => !jaEscolhidos.has(p.id));
          if (!cands.length) break;
          const livres = cands.filter(p => usadoEm[p.id] == null || (di - usadoEm[p.id]) > naoRepetir);
          if (livres.length) cands = livres;
          const melhor = escolherMelhor(cands, catMax[cat], custoPrato, insumoMap, pessoas, estoqueRest, wCusto, wEstoque);
          if (!melhor) break;
          const cobAntes = cobertura(melhor, insumoMap, pessoas, estoqueRest);
          instTotal++; if (cobAntes >= 0.999) instCobertas++;
          consomeEstoque(melhor, insumoMap, pessoas, estoqueRest);
          escolhidos.push(melhor.id); jaEscolhidos.add(melhor.id);
          usadoEm[melhor.id] = di;
          custoTotal += custoPrato(melhor) * pessoas;
        }
      });

      if (escolhidos.length) dia[ref.id] = { pratos: escolhidos, previsto: pessoas };
    });

    if (repetirJanta && refeicoes.some(r => r.id === "janta") && dia.almoco) {
      dia.janta = { pratos: dia.almoco.pratos.slice(), previsto: pessoas, sobra: true };
    }
    if (Object.keys(dia).length) plano[data] = dia;
  });

  return { plano, meta: { custoTotal, coberturaPct: instTotal ? Math.round(100 * instCobertas / instTotal) : 0, refeicoes: instTotal } };
}

// ---------------------------------------------------------------------------
// Camada opcional de IA (DeepSeek via Edge Function).
// ---------------------------------------------------------------------------
export async function refinarComIA({ url, anon, pratos, estoque, insumoMap, custoPrato, planoLocal, datas, refeicoes, planoRef, pessoas, opts }) {
  if (!url) throw new Error("IA não configurada");
  const catalogo = pratos.map(p => ({
    id: p.id, nome: p.nome, categoria: p.categoria, custo: Number(custoPrato(p).toFixed(2)),
    refeicoes: (p.refeicoes && p.refeicoes.length) ? p.refeicoes : "todas",
  }));
  const estoqueLista = Object.keys(estoque || {}).filter(id => insumoMap[id]).map(id => ({ insumo: insumoMap[id].nome, qtd: estoque[id], unidade: insumoMap[id].unidade }));
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + anon, "apikey": anon },
    body: JSON.stringify({
      pratos: catalogo, estoque: estoqueLista,
      datas, refeicoes: refeicoes.map(x => ({ id: x.id, nome: x.nome })), pessoas,
      plano_refeicao: planoRef,
      regras: {
        priorizar_custo: !!opts?.priorizarCusto, priorizar_estoque: !!opts?.priorizarEstoque,
        nao_repetir_dias: opts?.naoRepetir ?? 3,
        cada_prato_so_nas_refeicoes_marcadas: true,
        base_incluir_todas_as_ativas: true,
      },
      proposta_local: planoLocal,
    }),
  });
  const d = await r.json();
  if (!r.ok || d.erro || !d.plano) throw new Error(d.erro || ("erro " + r.status));
  const pratoPorId = Object.fromEntries(pratos.map(p => [p.id, p]));
  const plano = {};
  Object.keys(d.plano || {}).forEach(data => {
    const dia = {};
    Object.keys(d.plano[data] || {}).forEach(refId => {
      const ids = (d.plano[data][refId] || []).filter(id => pratoPorId[id] && serveRefeicao(pratoPorId[id], refId));
      if (ids.length) dia[refId] = { pratos: ids, previsto: pessoas };
    });
    if (Object.keys(dia).length) plano[data] = dia;
  });
  return plano;
}

function aplicarRepetirJanta(plano, refeicoes, pessoas) {
  if (!refeicoes.some(r => r.id === "janta")) return plano;
  const novo = {};
  Object.keys(plano).forEach(data => {
    const dia = { ...plano[data] };
    if (dia.almoco) dia.janta = { pratos: dia.almoco.pratos.slice(), previsto: pessoas, sobra: true };
    novo[data] = dia;
  });
  return novo;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
const inp = { border: "1px solid " + C.line, borderRadius: 8, padding: "8px 10px", fontSize: 14, background: C.paper, color: C.ink };
const chip = (on) => ({ border: "1px solid " + (on ? C.brand : C.line), background: on ? C.brand : C.card, color: on ? "#fff" : C.muted, borderRadius: 20, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" });
const stepper = (label, val, setVal, min, max, disponivel) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid " + C.line, borderRadius: 10, background: C.card, opacity: disponivel ? 1 : 0.45 }}>
    <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{label}</span>
    <button type="button" disabled={!disponivel || val <= min} onClick={() => setVal(Math.max(min, val - 1))} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid " + C.line, background: C.paper, color: C.brand, fontWeight: 700, cursor: (disponivel && val > min) ? "pointer" : "default" }}>−</button>
    <span style={{ minWidth: 18, textAlign: "center", fontSize: 14, color: C.ink, fontWeight: 700 }}>{val}</span>
    <button type="button" disabled={!disponivel || val >= max} onClick={() => setVal(Math.min(max, val + 1))} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid " + C.line, background: C.paper, color: C.brand, fontWeight: 700, cursor: (disponivel && val < max) ? "pointer" : "default" }}>+</button>
  </div>
);

export function GerarCardapioModal({ cardapio, pratos, pratoMap, custoPrato, insumoMap, estoque, tiposRefeicao, previstoPadrao, iaUrl, onAplicar, onFechar }) {
  const [de, setDe] = useState(hojeISO());
  const [ate, setAte] = useState(addDias(hojeISO(), 6));
  const [refSel, setRefSel] = useState(() => tiposRefeicao.map(t => t.id));
  const [qtGuarnicao, setQtGuarnicao] = useState(2);
  const [qtSalada, setQtSalada] = useState(1);
  const [incluirSobremesa, setIncluirSobremesa] = useState(true);
  const [incluirBebida, setIncluirBebida] = useState(true);
  const [priorCusto, setPriorCusto] = useState(true);
  const [priorEstoque, setPriorEstoque] = useState(true);
  const [naoRepetir, setNaoRepetir] = useState(3);
  const [pessoas, setPessoas] = useState(previstoPadrao || 100);
  const [sobrescrever, setSobrescrever] = useState(false);
  const [usarIA, setUsarIA] = useState(false);
  const [repetirJanta, setRepetirJanta] = useState(false);
  const [proposta, setProposta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  const datas = useMemo(() => (de && ate && ate >= de ? intervalo(de, ate) : []), [de, ate]);
  const anon = (typeof window !== "undefined" && window.SUPABASE_ANON) || "";
  const temAlmoco = tiposRefeicao.some(t => t.id === "almoco");
  const temJanta = tiposRefeicao.some(t => t.id === "janta");
  const repetirJantaDisponivel = temAlmoco && temJanta;

  const contagem = useMemo(() => {
    const c = {};
    ORDEM_CAT.forEach(cat => { c[cat] = pratos.filter(p => p.categoria === cat).length; });
    return c;
  }, [pratos]);
  const semProteina = contagem["Proteína"] === 0;

  const tog = (arr, set, id) => set(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const gerar = async () => {
    setErro("");
    if (!datas.length) { setErro("Escolha um período válido (De ≤ Até)."); return; }
    if (semProteina) { setErro("Você não tem nenhum prato cadastrado na categoria 'Proteína'. Cadastre pelo menos um antes de gerar."); return; }
    let refeicoes = tiposRefeicao.filter(t => refSel.includes(t.id));
    if (repetirJanta) {
      if (!repetirJantaDisponivel) { setErro("Pra repetir o almoço no jantar, cadastre os tipos de refeição 'Almoço' e 'Janta'."); return; }
      const almocoT = tiposRefeicao.find(t => t.id === "almoco"), jantaT = tiposRefeicao.find(t => t.id === "janta");
      if (!refeicoes.some(r => r.id === "almoco")) refeicoes = [...refeicoes, almocoT];
      if (!refeicoes.some(r => r.id === "janta")) refeicoes = [...refeicoes, jantaT];
    }
    if (!refeicoes.length) { setErro("Escolha ao menos uma refeição."); return; }
    setBusy(true);
    const planoRef = {
      "Proteína":  { qtd: 1 },
      "Base":      { qtd: "todas" },
      "Guarnição": { qtd: qtGuarnicao },
      "Salada":    { qtd: qtSalada },
      "Sobremesa": incluirSobremesa ? { qtd: 1 } : null,
      "Bebida":    incluirBebida ? { qtd: 1 } : null,
    };
    const opts = { priorizarCusto: priorCusto, priorizarEstoque: priorEstoque, naoRepetir: Number(naoRepetir), sobrescrever, repetirJantaNoAlmoco: repetirJanta };
    const local = gerarCardapioLocal({ pratos, custoPrato, insumoMap, pratoMap, estoque, cardapio, datas, refeicoes, planoRef, pessoas: Number(pessoas) || 100, opts });
    if (usarIA && iaUrl) {
      try {
        const refeicoesParaIA = repetirJanta ? refeicoes.filter(r => r.id !== "janta") : refeicoes;
        let planoIA = await refinarComIA({ url: iaUrl, anon, pratos, estoque, insumoMap, custoPrato, planoLocal: local.plano, datas, refeicoes: refeicoesParaIA, planoRef, pessoas: Number(pessoas) || 100, opts });
        if (repetirJanta) planoIA = aplicarRepetirJanta(planoIA, refeicoes, Number(pessoas) || 100);
        let custoTotal = 0, inst = 0;
        Object.values(planoIA).forEach(dia => Object.keys(dia).forEach(refId => { if (dia[refId].sobra) return; dia[refId].pratos.forEach(id => { custoTotal += custoPrato(pratoMap[id]) * (Number(pessoas) || 100); inst++; }); }));
        setProposta({ plano: planoIA, meta: { custoTotal, coberturaPct: local.meta.coberturaPct, refeicoes: inst }, fonte: "IA (DeepSeek)" });
      } catch (e) {
        setProposta({ ...local, fonte: "local (IA indisponível: " + String(e.message || e).slice(0, 50) + ")" });
      }
    } else {
      setProposta({ ...local, fonte: "motor local" });
    }
    setBusy(false);
  };

  const aplicar = () => { if (proposta) { onAplicar(proposta.plano, sobrescrever); onFechar(); } };

  const nomePratoComCat = (id) => { const p = pratoMap[id]; if (!p) return "—"; return p.nome; };
  const catDoPrato = (id) => pratoMap[id]?.categoria || "";

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(28,42,54,.5)", zIndex: 120, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, border: "1px solid " + C.line, boxShadow: SH2, width: "100%", maxWidth: 660, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.brand }}>Gerar cardápio</div>
          <button onClick={onFechar} style={{ background: "transparent", color: C.muted, border: "1px solid " + C.line, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>Fechar</button>
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px" }}>
          Cada refeição sempre tem <b>1 proteína</b> + <b>todas as bases</b> (arroz, feijão) + guarnição(ões) + salada(s). Sobremesa e bebida são opcionais.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>De<input type="date" value={de} onChange={e => setDe(e.target.value)} style={inp} /></label>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>Até<input type="date" value={ate} onChange={e => setAte(e.target.value)} style={inp} /></label>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>Pessoas<input type="number" min="1" value={pessoas} onChange={e => setPessoas(e.target.value)} style={{ ...inp, width: 90 }} /></label>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>Não repetir por (dias)<input type="number" min="0" value={naoRepetir} onChange={e => setNaoRepetir(e.target.value)} style={{ ...inp, width: 100 }} /></label>
        </div>

        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, margin: "14px 0 6px" }}>Refeições</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{tiposRefeicao.map(t => <button key={t.id} onClick={() => tog(refSel, setRefSel, t.id)} style={chip(refSel.includes(t.id))}>{t.nome}</button>)}</div>

        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, margin: "14px 0 6px" }}>Composição por refeição</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "1px solid " + C.line, borderRadius: 10, background: C.sage, color: C.brand, fontSize: 12.5, fontWeight: 700 }}>1 Proteína</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "1px solid " + C.line, borderRadius: 10, background: C.sage, color: C.brand, fontSize: 12.5, fontWeight: 700 }}>Todas as bases ({contagem["Base"] || 0})</span>
          {stepper("Guarnições", qtGuarnicao, setQtGuarnicao, 0, 2, contagem["Guarnição"] > 0)}
          {stepper("Saladas", qtSalada, setQtSalada, 0, 2, contagem["Salada"] > 0)}
          <button type="button" onClick={() => setIncluirSobremesa(v => !v)} disabled={!contagem["Sobremesa"]} title={contagem["Sobremesa"] ? "" : "Nenhum prato cadastrado na categoria Sobremesa"} style={{ ...chip(incluirSobremesa && contagem["Sobremesa"] > 0), opacity: contagem["Sobremesa"] ? 1 : 0.45, cursor: contagem["Sobremesa"] ? "pointer" : "not-allowed" }}>🍰 Sobremesa</button>
          <button type="button" onClick={() => setIncluirBebida(v => !v)} disabled={!contagem["Bebida"]} title={contagem["Bebida"] ? "" : "Nenhum prato cadastrado na categoria Bebida"} style={{ ...chip(incluirBebida && contagem["Bebida"] > 0), opacity: contagem["Bebida"] ? 1 : 0.45, cursor: contagem["Bebida"] ? "pointer" : "not-allowed" }}>🥤 Bebida</button>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          {semProteina && <span style={{ color: C.clay, fontWeight: 600 }}>⚠ Cadastre pelo menos 1 prato como <b>Proteína</b> — sem isso o gerador não roda.</span>}
          {!semProteina && !contagem["Base"] && <span style={{ color: C.clay }}>⚠ Nenhum prato marcado como <b>Base</b> — arroz/feijão não vão sair do gerador. Ajuste na aba Fichas &amp; custos.</span>}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
          <button onClick={() => setPriorCusto(v => !v)} style={chip(priorCusto)}>💲 Priorizar menor custo</button>
          <button onClick={() => setPriorEstoque(v => !v)} style={chip(priorEstoque)}>📦 Preferir o que há em estoque</button>
          <button onClick={() => setSobrescrever(v => !v)} style={chip(sobrescrever)}>{sobrescrever ? "Sobrescreve dias preenchidos" : "Só preenche dias vazios"}</button>
          <button onClick={() => repetirJantaDisponivel && setRepetirJanta(v => !v)} disabled={!repetirJantaDisponivel} title={repetirJantaDisponivel ? "" : "Cadastre os tipos 'Almoço' e 'Janta' pra habilitar"} style={{ ...chip(repetirJanta && repetirJantaDisponivel), opacity: repetirJantaDisponivel ? 1 : 0.45, cursor: repetirJantaDisponivel ? "pointer" : "not-allowed" }}>🍲 Repetir almoço no jantar (aproveita sobras)</button>
          <button onClick={() => iaUrl && setUsarIA(v => !v)} disabled={!iaUrl} title={iaUrl ? "" : "Configure a Edge Function da DeepSeek para habilitar"} style={{ ...chip(usarIA && !!iaUrl), opacity: iaUrl ? 1 : 0.45, cursor: iaUrl ? "pointer" : "not-allowed" }}>✨ Refinar com IA (DeepSeek)</button>
        </div>

        {erro && <div style={{ marginTop: 12, fontSize: 13, color: C.clay, background: "#FBEAE3", border: "1px solid " + C.clay, borderRadius: 8, padding: "8px 10px" }}>{erro}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={gerar} disabled={busy} style={{ background: C.brand, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer" }}>{busy ? "gerando…" : (proposta ? "Gerar de novo" : "Gerar proposta")}</button>
          {proposta && <button onClick={aplicar} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Aplicar ao cardápio</button>}
        </div>

        {proposta && (
          <div style={{ marginTop: 16, borderTop: "1px solid " + C.line, paddingTop: 12 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, marginBottom: 10 }}>
              <span>Fonte: <b style={{ color: C.ink }}>{proposta.fonte}</b></span>
              <span>Custo estimado: <b style={{ color: C.ink }}>{brl(proposta.meta.custoTotal)}</b></span>
              <span>Refeições montadas: <b style={{ color: C.ink }}>{proposta.meta.refeicoes}</b></span>
              <span>Coberto pelo estoque: <b style={{ color: C.ink }}>{proposta.meta.coberturaPct}%</b></span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {Object.keys(proposta.plano).sort().map(data => {
                const dd = fromISO(data);
                return (
                  <div key={data} style={{ border: "1px solid " + C.line, borderRadius: 10, padding: "8px 10px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.brand }}>{NOMES[dd.getDay()]} · {fmtData(data)}</div>
                    {Object.keys(proposta.plano[data]).map(refId => {
                      const t = tiposRefeicao.find(x => x.id === refId);
                      const r = proposta.plano[data][refId];
                      // agrupa por categoria pra ficar bonito de ler
                      const porCat = {};
                      r.pratos.forEach(id => { const c = catDoPrato(id) || "—"; (porCat[c] = porCat[c] || []).push(nomePratoComCat(id)); });
                      return (
                        <div key={refId} style={{ fontSize: 12.5, color: C.ink, marginTop: 4 }}>
                          <span style={{ color: C.muted }}>{t?.nome || refId}:</span>{" "}
                          {ORDEM_CAT.filter(c => porCat[c]).map((c, i) => (
                            <span key={c}>{i > 0 ? " · " : ""}<span style={{ color: C.muted, fontSize: 11 }}>{c}:</span> {porCat[c].join(", ")}</span>
                          ))}
                          {r.sobra ? <span style={{ color: C.muted }}> (sobra do almoço)</span> : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
