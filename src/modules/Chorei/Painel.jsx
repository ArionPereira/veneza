import React from "react";
const { useState, useEffect, useMemo } = React;
import { C, SERIF, SH } from "../../constants.js";
import { tipoInfo, prioridadeInfo, ehProjeto, ehTerminal, badge, fmtData, hojeISO } from "./choreiconst.js";

const chip = (cor) => ({ ...badge(cor), fontSize:11 });

function copiarTexto(txt) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(txt);
  return new Promise((res, rej) => {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); res(); } catch (e) { rej(e); }
    document.body.removeChild(ta);
  });
}

// Painel consolidado: as equipes lado a lado, pra projetar na reunião.
export function Painel({ equipes, itens, etapas, usuarios }) {
  const [tv, setTv] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const hoje = hojeISO();

  // sai do modo TV quando o usuário aperta Esc (sai do fullscreen)
  useEffect(() => {
    const f = () => { if (!document.fullscreenElement) setTv(false); };
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  const alternarTv = () => {
    if (!tv) { document.documentElement.requestFullscreen?.().catch(() => {}); setTv(true); }
    else { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); setTv(false); }
  };

  const porEquipe = useMemo(() => equipes.filter(e => e.ativo).map(eq => {
    const its = itens.filter(i => i.equipe_id === eq.id);
    const dia = its.filter(i => !ehProjeto(i));
    const criadosHoje = dia.filter(i => (i.criado_em || "").slice(0,10) === hoje);
    const pendentes = dia.filter(i => (i.criado_em || "").slice(0,10) < hoje && !ehTerminal(i.status));
    const projetos = its.filter(i => ehProjeto(i) && !ehTerminal(i.status));
    const atrasados = its.filter(i => !ehTerminal(i.status) && i.prazo && i.prazo < hoje);
    return { eq, criadosHoje, pendentes, projetos, atrasados };
  }), [equipes, itens, hoje]);

  const dono = (i) => i.responsavel_nome || (usuarios.find(u => u.id === i.responsavel_id)?.nome) || null;

  const progresso = (p) => {
    const et = etapas.filter(e => e.item_id === p.id);
    if (!et.length) return null;
    const feitas = et.filter(e => e.feito).length;
    return { feitas, total: et.length, pct: Math.round(feitas / et.length * 100) };
  };

  const gerarResumo = () => {
    const L = ["*Chōrei — " + fmtData(hoje) + "*"];
    porEquipe.forEach(({ eq, criadosHoje, pendentes, projetos }) => {
      L.push("", "*" + eq.nome + "*");
      const dif = criadosHoje.filter(i => i.tipo === "dificuldade");
      const pla = criadosHoje.filter(i => i.tipo === "plano");
      const avi = criadosHoje.filter(i => i.tipo === "aviso" || i.tipo === "ontem");
      const linha = (i) => { const d = dono(i); return "• " + i.texto + (d ? " _(" + d + ")_" : ""); };
      if (!pendentes.length && !dif.length && !pla.length && !avi.length && !projetos.length) {
        L.push("— sem registros hoje");
        return;
      }
      if (pendentes.length) { L.push("↩ Pendentes (" + pendentes.length + "):"); pendentes.forEach(i => L.push(linha(i))); }
      if (dif.length)       { L.push("⚠ Dificuldades:"); dif.forEach(i => L.push(linha(i))); }
      if (pla.length)       { L.push("→ Plano de hoje:"); pla.forEach(i => L.push(linha(i))); }
      if (avi.length)       { L.push("! Avisos:"); avi.forEach(i => L.push(linha(i))); }
      if (projetos.length) {
        L.push("◆ Projetos:");
        projetos.forEach(p => {
          const pr = progresso(p);
          L.push("• " + p.texto
            + (pr ? " — " + pr.feitas + "/" + pr.total + " etapas (" + pr.pct + "%)" : "")
            + (p.status === "pausado" ? " ⏸ pausado" : "")
            + (p.prazo && p.prazo < hoje ? " ⏰ atrasado" : ""));
        });
      }
    });
    return L.join("\n");
  };

  const copiarResumo = async () => {
    try { await copiarTexto(gerarResumo()); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { window.prompt("Copie o resumo:", gerarResumo()); }
  };

  const Linha = ({ i }) => {
    const t = tipoInfo(i.tipo);
    const atrasado = i.prazo && i.prazo < hoje && !ehTerminal(i.status);
    const d = dono(i);
    return (
      <div style={{ display:"flex", gap:7, alignItems:"baseline", padding:"5px 8px",
        background:C.paper, border:"1px solid "+(atrasado ? C.clay : C.line), borderRadius:7 }}>
        <span title={t.label} style={{ color:t.cor, fontWeight:700, flexShrink:0 }}>{t.icone}</span>
        <span style={{ flex:1, fontSize:12.5, color:C.ink, lineHeight:1.3 }}>{i.texto}</span>
        <span style={{ fontSize:10.5, color:atrasado ? C.clay : C.muted, whiteSpace:"nowrap", flexShrink:0 }}>
          {atrasado && "⏰ "}{d || ""}
        </span>
      </div>
    );
  };

  const Projeto = ({ p }) => {
    const pr = progresso(p);
    const pinf = prioridadeInfo(p.prioridade);
    const atrasado = p.prazo && p.prazo < hoje;
    return (
      <div style={{ padding:"5px 8px", background:C.paper, border:"1px solid "+(atrasado ? C.clay : C.line), borderRadius:7 }}>
        <div style={{ display:"flex", gap:6, alignItems:"baseline" }}>
          <span title={"Prioridade "+pinf.label} style={{ width:8, height:8, borderRadius:"50%", background:pinf.cor, flexShrink:0, alignSelf:"center" }} />
          <span style={{ flex:1, fontSize:12.5, color:C.ink, lineHeight:1.3, fontWeight:600 }}>{p.texto}</span>
          {p.status === "pausado" && <span style={{ fontSize:10.5, color:C.brand2, fontWeight:700, flexShrink:0 }}>⏸</span>}
          {atrasado && <span style={{ fontSize:10.5, color:C.clay, fontWeight:700, flexShrink:0 }}>⏰</span>}
        </div>
        {pr && (
          <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:4 }}>
            <div style={{ flex:1, height:5, background:C.sage, borderRadius:5, overflow:"hidden" }}>
              <div style={{ width:pr.pct+"%", height:"100%", background:pr.pct===100?C.green:C.accent }} />
            </div>
            <span style={{ fontSize:10.5, color:C.muted, fontWeight:700 }}>{pr.pct}%</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop:16, zoom: tv ? 1.35 : 1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:1, textTransform:"uppercase", color:C.accent, fontWeight:700 }}>Painel da reunião</div>
          <div style={{ fontFamily:SERIF, fontSize:20, color:C.brand, fontWeight:600 }}>{fmtData(hoje)}</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={copiarResumo}
            style={{ background:copiado ? C.green : C.brand, color:"#fff", border:"none", borderRadius:8,
              padding:"8px 14px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {copiado ? "✓ Copiado!" : "📱 Copiar resumo (WhatsApp)"}
          </button>
          <button onClick={alternarTv}
            style={{ background:tv ? C.clay : "transparent", color:tv ? "#fff" : C.brand,
              border:"1px solid "+(tv ? C.clay : C.line), borderRadius:8,
              padding:"8px 14px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {tv ? "✕ Sair do modo TV" : "📺 Modo TV"}
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:14 }}>
        {porEquipe.map(({ eq, criadosHoje, pendentes, projetos, atrasados }) => {
          const dif = criadosHoje.filter(i => i.tipo === "dificuldade");
          const pla = criadosHoje.filter(i => i.tipo === "plano");
          const avi = criadosHoje.filter(i => i.tipo === "aviso" || i.tipo === "ontem");
          const vazio = !pendentes.length && !criadosHoje.length && !projetos.length;
          return (
            <div key={eq.id} style={{ background:C.card, border:"1px solid "+C.line, borderTop:"4px solid "+(eq.cor||C.brand),
              borderRadius:12, padding:"12px 14px", boxShadow:SH, display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontFamily:SERIF, fontSize:17, color:eq.cor||C.brand, fontWeight:700 }}>{eq.nome}</span>
                <div style={{ marginLeft:"auto", display:"flex", gap:5, flexWrap:"wrap" }}>
                  {atrasados.length > 0 && <span style={chip(C.clay)}>⏰ {atrasados.length}</span>}
                  {pendentes.length > 0 && <span style={chip(C.muted)}>↩ {pendentes.length}</span>}
                  <span style={chip(eq.cor||C.brand)}>hoje: {criadosHoje.length}</span>
                </div>
              </div>

              {vazio && <div style={{ fontSize:12.5, color:C.muted, fontStyle:"italic" }}>Nada registrado. 🎉</div>}

              {pendentes.length > 0 && <>
                <div style={{ fontSize:10.5, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>Pendentes de ontem</div>
                {pendentes.map(i => <Linha key={i.id} i={i} />)}
              </>}
              {dif.length > 0 && <>
                <div style={{ fontSize:10.5, color:C.clay, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>Dificuldades</div>
                {dif.map(i => <Linha key={i.id} i={i} />)}
              </>}
              {pla.length > 0 && <>
                <div style={{ fontSize:10.5, color:C.brand, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>Plano de hoje</div>
                {pla.map(i => <Linha key={i.id} i={i} />)}
              </>}
              {avi.length > 0 && <>
                <div style={{ fontSize:10.5, color:"#B07D10", fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>Avisos</div>
                {avi.map(i => <Linha key={i.id} i={i} />)}
              </>}
              {projetos.length > 0 && <>
                <div style={{ fontSize:10.5, color:C.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>◆ Projetos</div>
                {projetos.map(p => <Projeto key={p.id} p={p} />)}
              </>}
            </div>
          );
        })}
      </div>

      {tv && (
        <p style={{ fontSize:12, color:C.muted, textAlign:"center", marginTop:16 }}>
          Atualiza sozinho quando alguém lança um item. Esc sai do modo TV.
        </p>
      )}
    </div>
  );
}
