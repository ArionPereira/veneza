import React from "react";
const { useState } = React;
import { C, SH, SH2 } from "../../constants.js";
import { STATUS, tipoInfo, statusInfo, prioridadeInfo, ehProjeto, ehTerminal, badge, fmtData, fmtDataHora, hojeISO } from "./choreiconst.js";
import { atualizarItem, apagarItem, converterEmProjeto } from "./choreidb.js";

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"7px 10px", fontSize:13, background:C.paper, color:C.ink, width:"100%" };
const lab = { fontSize:11, color:C.muted, fontWeight:600, marginBottom:3 };

export function ItemCard({ item, sessao, usuarios, podeEscrever, recarregar, onErro, mostrarEquipe }) {
  const [edit, setEdit] = useState(false);
  const [menu, setMenu] = useState(false);
  const [texto,   setTexto]   = useState(item.texto);
  const [resp,    setResp]    = useState(item.responsavel_id || "");
  const [prazo,   setPrazo]   = useState(item.prazo || "");
  const [busy, setBusy] = useState(false);

  const tinf = tipoInfo(item.tipo);
  const sinf = statusInfo(item.status);
  const isPrazoVencido = item.prazo && item.prazo < hojeISO() && !ehTerminal(item.status);

  const salvar = async () => {
    setBusy(true);
    try {
      const respUser = usuarios.find(u => u.id === resp);
      await atualizarItem(sessao.id, item.id, {
        texto,
        responsavelId: resp || null,
        responsavelNome: respUser?.nome ?? item.responsavel_nome ?? null,
        prazo: prazo || null,
      });
      setEdit(false);
      await recarregar();
    } catch (err) { onErro?.(err.message || String(err)); }
    setBusy(false);
  };

  const mudarStatus = async (novo) => {
    // preserva dono e prazo (a RPC zera o que vier null)
    const manter = { responsavelId: item.responsavel_id, responsavelNome: item.responsavel_nome, prazo: item.prazo };
    if (ehTerminal(novo)) {
      const r = window.prompt(`Como foi resolvido? (opcional)`);
      if (r === null) return;
      setBusy(true);
      try {
        await atualizarItem(sessao.id, item.id, { ...manter, status: novo, resolucao: r || null });
        await recarregar();
      } catch (err) { onErro?.(err.message || String(err)); }
      setBusy(false);
    } else {
      setBusy(true);
      try { await atualizarItem(sessao.id, item.id, { ...manter, status: novo }); await recarregar(); }
      catch (err) { onErro?.(err.message || String(err)); }
      setBusy(false);
    }
  };

  const virarProjeto = async () => {
    if (!window.confirm("Transformar este item em projeto de longa duração? Ele sai do fluxo do dia e vai pra lista de projetos da equipe, levando dono, prazo e histórico.")) return;
    setBusy(true);
    try { await converterEmProjeto(sessao.id, item.id); await recarregar(); }
    catch (err) {
      const m = err.message || String(err);
      onErro?.(/chorei_converter_em_projeto|schema cache/i.test(m)
        ? "Pra converter em projeto, rode uma vez o sql/chorei_v4.sql no Supabase (SQL Editor) e tente de novo."
        : m);
    }
    setBusy(false);
  };

  const apagar = async () => {
    if (!window.confirm("Apagar este item?")) return;
    setBusy(true);
    try { await apagarItem(sessao.id, item.id); await recarregar(); }
    catch (err) { onErro?.(err.message || String(err)); }
    setBusy(false);
  };

  const dono = item.responsavel_nome || (usuarios.find(u => u.id === item.responsavel_id)?.nome) || null;

  // menu "⋯": transições de status + demais ações
  const acoes = [];
  STATUS.filter(s => s.id !== item.status && (!s.soProjeto || ehProjeto(item)))
    .forEach(s => acoes.push({ rotulo: "→ " + s.label, cor: s.cor, run: () => mudarStatus(s.id) }));
  if ((item.tipo === "dificuldade" || item.tipo === "plano") && !ehTerminal(item.status))
    acoes.push({ rotulo: "◆ Virar projeto", cor: C.accent, run: virarProjeto });
  acoes.push({ rotulo: "✎ Editar", cor: C.ink, run: () => setEdit(true) });
  acoes.push({ rotulo: "Apagar", cor: C.clay, run: apagar });

  return (
    <div style={{
      background:C.card, border:"1px solid "+C.line,
      borderLeft:"3px solid "+(isPrazoVencido ? C.clay : (tinf.cor || C.brand)),
      borderRadius:10, padding:"10px 12px",
      boxShadow:SH, opacity: ehTerminal(item.status) ? 0.65 : 1,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
        <span style={badge(tinf.cor || C.brand)}>{tinf.icone} {tinf.label}</span>
        {item.status !== "aberto" && <span style={badge(sinf.cor)}>{sinf.label}</span>}
        {ehProjeto(item) && item.prioridade && item.prioridade !== "media" && (
          <span style={badge(prioridadeInfo(item.prioridade).cor)}>{prioridadeInfo(item.prioridade).label}</span>
        )}
        {mostrarEquipe && item._equipeNome && (
          <span style={badge(item._equipeCor || C.brand)}>{item._equipeNome}</span>
        )}
        {isPrazoVencido && <span style={badge(C.clay)}>⏰ atrasado</span>}
        <span style={{ marginLeft:"auto", fontSize:11, color:C.muted }}>{fmtDataHora(item.criado_em)}</span>
      </div>

      {edit ? (
        <>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} style={{...inp, resize:"vertical", margin:"8px 0"}} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
            <div style={{ flex:"1 1 140px" }}>
              <div style={lab}>Dono</div>
              {usuarios.length > 0 ? (
                <select value={resp} onChange={e => setResp(e.target.value)} style={inp}>
                  <option value="">— sem dono —</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              ) : (
                <input placeholder="Nome do dono" value={item.responsavel_nome || ""} readOnly style={{...inp, opacity:.6}} />
              )}
            </div>
            <div style={{ flex:"0 0 130px" }}>
              <div style={lab}>Prazo</div>
              <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => salvar()} disabled={busy}
              style={{ background:C.brand, color:"#fff", border:"none", borderRadius:7, padding:"6px 12px", fontSize:12.5, fontWeight:600, cursor:busy?"default":"pointer" }}>
              {busy ? "salvando…" : "Salvar"}
            </button>
            <button onClick={() => { setEdit(false); setTexto(item.texto); }}
              style={{ background:"transparent", color:C.muted, border:"1px solid "+C.line, borderRadius:7, padding:"6px 12px", fontSize:12.5, cursor:"pointer" }}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize:13.5, color:C.ink, whiteSpace:"pre-wrap", lineHeight:1.4, margin:"6px 0 0" }}>{item.texto}</div>

          {(dono || item.prazo || item.autor_nome) && (
            <div style={{ fontSize:11.5, color:C.muted, marginTop:5, display:"flex", gap:12, flexWrap:"wrap" }}>
              {dono && <span>👤 {dono}</span>}
              {item.prazo && <span style={{ color:isPrazoVencido ? C.clay : C.muted }}>📅 {fmtData(item.prazo)}</span>}
              {item.autor_nome && <span>por {item.autor_nome}</span>}
            </div>
          )}

          {item.resolucao && (
            <div style={{ marginTop:6, padding:"6px 8px", background:C.sage, border:"1px solid "+C.line, borderRadius:7, fontSize:12, color:C.ink }}>
              <b style={{ color:C.brand }}>Resolução:</b> {item.resolucao}
            </div>
          )}

          {podeEscrever && (
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
              {!ehTerminal(item.status) && (
                <button onClick={() => mudarStatus("resolvido")} disabled={busy}
                  style={{ background:C.green+"12", color:C.green, border:"1px solid "+C.green+"40",
                    borderRadius:7, padding:"4px 12px", fontSize:12, fontWeight:700, cursor:busy?"default":"pointer" }}>
                  ✓ Resolver
                </button>
              )}
              <div style={{ position:"relative", marginLeft:"auto" }}>
                <button onClick={() => setMenu(m => !m)} disabled={busy} title="Mais ações"
                  style={{ background:"transparent", color:C.muted, border:"1px solid "+C.line,
                    borderRadius:7, padding:"2px 10px", fontSize:15, lineHeight:1.4, cursor:"pointer", fontWeight:700 }}>
                  ⋯
                </button>
                {menu && (
                  <>
                    <div onClick={() => setMenu(false)} style={{ position:"fixed", inset:0, zIndex:60 }} />
                    <div style={{ position:"absolute", right:0, top:"calc(100% + 4px)", zIndex:61,
                      background:C.card, border:"1px solid "+C.line, borderRadius:10, boxShadow:SH2,
                      minWidth:180, padding:4 }}>
                      {acoes.map(a => (
                        <button key={a.rotulo} onClick={() => { setMenu(false); a.run(); }}
                          style={{ display:"block", width:"100%", textAlign:"left", background:"transparent",
                            border:"none", padding:"7px 11px", fontSize:12.5, fontWeight:600,
                            color:a.cor, cursor:"pointer", borderRadius:7 }}
                          onMouseEnter={e => e.currentTarget.style.background = C.sage}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          {a.rotulo}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
