import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH, SH2, CATEGORIAS, brl, num, fatorUnidade } from "../constants.js";
import { hojeISO, addDias, fromISO, fmtData, intervalo, NOMES } from "../dates.js";

// ---------------------------------------------------------------------------
// Motor LOCAL de geração de cardápio (puro JS, sem IA):
// prioriza menor custo e o que já tem em estoque, evita repetir prato em dias
// próximos e monta cada refeição com um prato por categoria selecionada.
// ---------------------------------------------------------------------------

// quantidade necessária de cada insumo (na unidade do insumo) p/ servir `pessoas`
function necessidade(prato, insumoMap, pessoas) {
  const m = {};
  (prato.ficha || []).forEach(l => {
    const i = insumoMap[l.insumoId]; if (!i) return;
    const q = (Number(l.g) || 0) * pessoas / fatorUnidade(i.unidade) * (Number(i.fc) || 1);
    m[l.insumoId] = (m[l.insumoId] || 0) + q;
  });
  return m;
}
// fração dos insumos do prato que o estoque restante cobre (0..1)
function cobertura(prato, insumoMap, pessoas, estoqueRest) {
  const need = necessidade(prato, insumoMap, pessoas);
  const ids = Object.keys(need); if (!ids.length) return 0;
  let ok = 0; ids.forEach(id => { if ((estoqueRest[id] || 0) >= need[id]) ok++; });
  return ok / ids.length;
}

export function gerarCardapioLocal({ pratos, custoPrato, insumoMap, estoque, datas, refeicoes, categorias, pessoas, opts }) {
  const estoqueRest = { ...(estoque || {}) };            // vai sendo consumido ao longo dos dias
  const usadoEm = {};                                     // pratoId -> índice do último dia usado
  const naoRepetir = Math.max(0, Number(opts?.naoRepetir ?? 3));
  const wCusto   = opts?.priorizarCusto   ? 1 : 0;
  const wEstoque = opts?.priorizarEstoque ? 1 : 0;

  // custo máximo por categoria (p/ normalizar o score de custo)
  const catMax = {};
  categorias.forEach(cat => {
    const cs = pratos.filter(p => p.categoria === cat).map(p => custoPrato(p));
    catMax[cat] = Math.max(1e-6, ...cs, 1e-6);
  });

  const plano = {};
  let custoTotal = 0, instTotal = 0, instCobertas = 0;

  datas.forEach((data, di) => {
    const dia = {};
    refeicoes.forEach(ref => {
      const escolhidos = [];
      categorias.forEach(cat => {
        let cands = pratos.filter(p => p.categoria === cat);
        if (!cands.length) return;
        // respeita "não repetir" — se sobrar alguém fora da janela, usa só esses
        const livres = cands.filter(p => usadoEm[p.id] == null || (di - usadoEm[p.id]) > naoRepetir);
        if (livres.length) cands = livres;
        // pontua cada candidato
        let melhor = null, melhorSc = -Infinity;
        cands.forEach(p => {
          const custoN = custoPrato(p) / catMax[cat];         // 0 barato .. 1 caro
          const cob = cobertura(p, insumoMap, pessoas, estoqueRest); // 0..1
          const sc = wCusto * (1 - custoN) + wEstoque * cob + 0.12 * Math.random();
          if (sc > melhorSc) { melhorSc = sc; melhor = p; }
        });
        if (!melhor) return;
        escolhidos.push(melhor.id);
        usadoEm[melhor.id] = di;
        // consome o estoque e contabiliza custo/cobertura
        const cobAntes = cobertura(melhor, insumoMap, pessoas, estoqueRest);
        instTotal++; if (cobAntes >= 0.999) instCobertas++;
        const need = necessidade(melhor, insumoMap, pessoas);
        Object.keys(need).forEach(id => { estoqueRest[id] = Math.max(0, (estoqueRest[id] || 0) - need[id]); });
        custoTotal += custoPrato(melhor) * pessoas;
      });
      if (escolhidos.length) dia[ref.id] = { pratos: escolhidos, previsto: pessoas };
    });
    if (Object.keys(dia).length) plano[data] = dia;
  });

  return { plano, meta: { custoTotal, coberturaPct: instTotal ? Math.round(100 * instCobertas / instTotal) : 0, refeicoes: instTotal } };
}

// ---------------------------------------------------------------------------
// Camada opcional de IA (DeepSeek via Edge Function). Recebe a proposta local
// e pede pro modelo reequilibrar. Cai de volta no local se não estiver pronto.
// ---------------------------------------------------------------------------
export async function refinarComIA({ url, anon, pratos, estoque, insumoMap, custoPrato, planoLocal, datas, refeicoes, categorias, pessoas, opts }) {
  if (!url) throw new Error("IA não configurada");
  const catalogo = pratos.map(p => ({ id: p.id, nome: p.nome, categoria: p.categoria, custo: Number(custoPrato(p).toFixed(2)) }));
  const estoqueLista = Object.keys(estoque || {}).filter(id => insumoMap[id]).map(id => ({ insumo: insumoMap[id].nome, qtd: estoque[id], unidade: insumoMap[id].unidade }));
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + anon, "apikey": anon },
    body: JSON.stringify({
      pratos: catalogo, estoque: estoqueLista,
      datas, refeicoes: refeicoes.map(x => ({ id: x.id, nome: x.nome })), categorias, pessoas,
      regras: { priorizar_custo: !!opts?.priorizarCusto, priorizar_estoque: !!opts?.priorizarEstoque, nao_repetir_dias: opts?.naoRepetir ?? 3 },
      proposta_local: planoLocal,
    }),
  });
  const d = await r.json();
  if (!r.ok || d.erro || !d.plano) throw new Error(d.erro || ("erro " + r.status));
  // valida: só ids de pratos existentes entram
  const validos = new Set(pratos.map(p => p.id));
  const plano = {};
  Object.keys(d.plano || {}).forEach(data => {
    const dia = {};
    Object.keys(d.plano[data] || {}).forEach(refId => {
      const ids = (d.plano[data][refId] || []).filter(id => validos.has(id));
      if (ids.length) dia[refId] = { pratos: ids, previsto: pessoas };
    });
    if (Object.keys(dia).length) plano[data] = dia;
  });
  return plano;
}

// ---------------------------------------------------------------------------
// Modal de geração
// ---------------------------------------------------------------------------
const inp = { border: "1px solid " + C.line, borderRadius: 8, padding: "8px 10px", fontSize: 14, background: C.paper, color: C.ink };
const chip = (on) => ({ border: "1px solid " + (on ? C.brand : C.line), background: on ? C.brand : C.card, color: on ? "#fff" : C.muted, borderRadius: 20, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" });

export function GerarCardapioModal({ cardapio, pratos, pratoMap, custoPrato, insumoMap, estoque, tiposRefeicao, previstoPadrao, iaUrl, onAplicar, onFechar }) {
  const [de, setDe] = useState(hojeISO());
  const [ate, setAte] = useState(addDias(hojeISO(), 6));
  const [refSel, setRefSel] = useState(() => tiposRefeicao.map(t => t.id));
  const catComPratos = CATEGORIAS.filter(c => pratos.some(p => p.categoria === c));
  const [catSel, setCatSel] = useState(catComPratos);
  const [priorCusto, setPriorCusto] = useState(true);
  const [priorEstoque, setPriorEstoque] = useState(true);
  const [naoRepetir, setNaoRepetir] = useState(3);
  const [pessoas, setPessoas] = useState(previstoPadrao || 100);
  const [sobrescrever, setSobrescrever] = useState(false);
  const [usarIA, setUsarIA] = useState(false);
  const [proposta, setProposta] = useState(null);   // {plano, meta, fonte}
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  const datas = useMemo(() => (de && ate && ate >= de ? intervalo(de, ate) : []), [de, ate]);
  const refeicoes = tiposRefeicao.filter(t => refSel.includes(t.id));
  const anon = (typeof window !== "undefined" && window.SUPABASE_ANON) || "";

  const tog = (arr, set, id) => set(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const gerar = async () => {
    setErro("");
    if (!datas.length) { setErro("Escolha um período válido (De ≤ Até)."); return; }
    if (!refeicoes.length) { setErro("Escolha ao menos uma refeição."); return; }
    if (!catSel.length) { setErro("Escolha ao menos uma categoria de prato."); return; }
    setBusy(true);
    const opts = { priorizarCusto: priorCusto, priorizarEstoque: priorEstoque, naoRepetir: Number(naoRepetir) };
    const local = gerarCardapioLocal({ pratos, custoPrato, insumoMap, estoque, datas, refeicoes, categorias: catSel, pessoas: Number(pessoas) || 100, opts });
    if (usarIA && iaUrl) {
      try {
        const planoIA = await refinarComIA({ url: iaUrl, anon, pratos, estoque, insumoMap, custoPrato, planoLocal: local.plano, datas, refeicoes, categorias: catSel, pessoas: Number(pessoas) || 100, opts });
        // recalcula meta a partir do plano da IA
        let custoTotal = 0, inst = 0;
        Object.values(planoIA).forEach(dia => Object.values(dia).forEach(r => r.pratos.forEach(id => { custoTotal += custoPrato(pratoMap[id]) * (Number(pessoas) || 100); inst++; })));
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

  const nomesPratos = (ids) => ids.map(id => pratoMap[id]?.nome || "—").join(", ");

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(28,42,54,.5)", zIndex: 120, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, border: "1px solid " + C.line, boxShadow: SH2, width: "100%", maxWidth: 640, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.brand }}>Gerar cardápio</div>
          <button onClick={onFechar} style={{ background: "transparent", color: C.muted, border: "1px solid " + C.line, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>Fechar</button>
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px" }}>Monta uma proposta priorizando custo e o que há em estoque. Você revê e aplica — a edição manual continua funcionando.</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>De<input type="date" value={de} onChange={e => setDe(e.target.value)} style={inp} /></label>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>Até<input type="date" value={ate} onChange={e => setAte(e.target.value)} style={inp} /></label>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>Pessoas<input type="number" min="1" value={pessoas} onChange={e => setPessoas(e.target.value)} style={{ ...inp, width: 90 }} /></label>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>Não repetir por (dias)<input type="number" min="0" value={naoRepetir} onChange={e => setNaoRepetir(e.target.value)} style={{ ...inp, width: 90 }} /></label>
        </div>

        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, margin: "14px 0 6px" }}>Refeições</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{tiposRefeicao.map(t => <button key={t.id} onClick={() => tog(refSel, setRefSel, t.id)} style={chip(refSel.includes(t.id))}>{t.nome}</button>)}</div>

        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, margin: "14px 0 6px" }}>Categorias por refeição</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{catComPratos.map(c => <button key={c} onClick={() => tog(catSel, setCatSel, c)} style={chip(catSel.includes(c))}>{c}</button>)}</div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
          <button onClick={() => setPriorCusto(v => !v)} style={chip(priorCusto)}>💲 Priorizar menor custo</button>
          <button onClick={() => setPriorEstoque(v => !v)} style={chip(priorEstoque)}>📦 Preferir o que há em estoque</button>
          <button onClick={() => setSobrescrever(v => !v)} style={chip(sobrescrever)}>{sobrescrever ? "Sobrescreve dias preenchidos" : "Só preenche dias vazios"}</button>
          <button onClick={() => iaUrl && setUsarIA(v => !v)} disabled={!iaUrl} title={iaUrl ? "" : "Configure a Edge Function da DeepSeek para habilitar"} style={{ ...chip(usarIA && !!iaUrl), opacity: iaUrl ? 1 : 0.45, cursor: iaUrl ? "pointer" : "not-allowed" }}>✨ Refinar com IA (DeepSeek)</button>
        </div>
        {!iaUrl && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>A IA fica disponível depois de publicar a função <code>sugerir-cardapio</code> no Supabase (o motor local já funciona sem ela).</div>}

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
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {Object.keys(proposta.plano).sort().map(data => {
                const dd = fromISO(data);
                return (
                  <div key={data} style={{ border: "1px solid " + C.line, borderRadius: 10, padding: "8px 10px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.brand }}>{NOMES[dd.getDay()]} · {fmtData(data)}</div>
                    {Object.keys(proposta.plano[data]).map(refId => {
                      const t = tiposRefeicao.find(x => x.id === refId);
                      return <div key={refId} style={{ fontSize: 12.5, color: C.ink, marginTop: 3 }}><span style={{ color: C.muted }}>{t?.nome || refId}:</span> {nomesPratos(proposta.plano[data][refId].pratos)}</div>;
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
