import React from "react";
const { useState } = React;
import { C, SH } from "../../constants.js";
import { STATUS, prioridadeInfo, PRIORIDADES, statusInfo, ehTerminal, fmtData, fmtDataHora, hojeISO } from "./choreiconst.js";
import { atualizarItem, apagarItem, salvarEtapa, marcarEtapa, apagarEtapa, criarNota, apagarNota } from "./choreidb.js";

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"7px 10px", fontSize:13, background:C.paper, color:C.ink, width:"100%", boxSizing:"border-box" };
const lab = { fontSize:11, color:C.muted, fontWeight:600, marginBottom:3 };
const pill = (cor) => ({ fontSize:10.5, fontWeight:700, color:"#fff", background:cor, borderRadius:20, padding:"2px 8px", whiteSpace:"nowrap" });

function BarraProgresso({ feitas, total }) {
  if (!total) return null;
  const pct = Math.round((feitas / total) * 100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, flex:"1 1 140px", minWidth:120 }}>
      <div style={{ flex:1, height:7, background:C.sage, borderRadius:6, overflow:"hidden" }}>
        <div style={{ width:pct+"%", height:"100%", background:pct===100?C.green:C.accent, transition:"width .25s ease" }} />
      </div>
      <span style={{ fontSize:11.5, color:C.muted, fontWeight:700, whiteSpace:"nowrap" }}>{feitas}/{total} · {pct}%</span>
    </div>
  );
}

// Cartão de projeto/atividade de longa duração: compacto na lista, expande
// pra mostrar etapas (checklist com progresso) e observações (diário).
export function ProjetoCard({ item, etapas, notas, sessao, usuarios, podeEscrever, recarregar, onErro, semV3 }) {
  const [aberto, setAberto] = useState(false);
  const [edit,   setEdit]   = useState(false);
  const [busy,   setBusy]   = useState(false);

  const [texto,      setTexto]      = useState(item.texto);
  const [resp,       setResp]       = useState(item.responsavel_id || "");
  const [prazo,      setPrazo]      = useState(item.prazo || "");
  const [inicio,     setInicio]     = useState(item.inicio || "");
  const [prioridade, setPrioridade] = useState(item.prioridade || "media");

  const [novaEtapa, setNovaEtapa] = useState({ texto:"", responsavel:"", prazo:"" });
  const [novaNota,  setNovaNota]  = useState("");

  const pinf = prioridadeInfo(item.prioridade);
  const sinf = statusInfo(item.status);
  const terminal = ehTerminal(item.status);
  const atrasado = item.prazo && item.prazo < hojeISO() && !terminal;
  const feitas = etapas.filter(e => e.feito).length;
  const dono = item.responsavel_nome || (usuarios.find(u => u.id === item.responsavel_id)?.nome) || null;
  const ultimaNota = notas[0] || null;

  const rode = (fn) => async (...args) => {
    setBusy(true);
    try { await fn(...args); await recarregar(); }
    catch (err) { onErro?.(err.message || String(err)); }
    setBusy(false);
  };

  const salvarEdicao = rode(async () => {
    const respUser = usuarios.find(u => u.id === resp);
    await atualizarItem(sessao.id, item.id, {
      texto,
      responsavelId: resp || null,
      responsavelNome: respUser?.nome ?? item.responsavel_nome ?? null,
      prazo: prazo || null,
      prioridade,
      inicio: inicio || null,
    });
    setEdit(false);
  });

  const mudarStatus = async (novo) => {
    let resolucao = null;
    if (ehTerminal(novo)) {
      const r = window.prompt(novo === "resolvido" ? "Como foi concluído? (opcional)" : "Por que foi cancelado? (opcional)");
      if (r === null) return;
      resolucao = r || null;
    }
    // preserva dono e prazo (a RPC zera o que vier null)
    await rode(() => atualizarItem(sessao.id, item.id, {
      responsavelId: item.responsavel_id, responsavelNome: item.responsavel_nome, prazo: item.prazo,
      status: novo, resolucao,
    }))();
  };

  const apagar = async () => {
    if (!window.confirm("Apagar este projeto (com etapas e observações)?")) return;
    await rode(() => apagarItem(sessao.id, item.id))();
  };

  const addEtapa = rode(async () => {
    if (!novaEtapa.texto.trim()) return;
    const respUser = usuarios.find(u => u.id === novaEtapa.responsavel);
    await salvarEtapa(sessao.id, {
      itemId: item.id, texto: novaEtapa.texto.trim(),
      responsavelId: novaEtapa.responsavel || null,
      responsavelNome: respUser?.nome || null,
      prazo: novaEtapa.prazo || null,
    });
    setNovaEtapa({ texto:"", responsavel:"", prazo:"" });
  });

  const addNota = rode(async () => {
    if (!novaNota.trim()) return;
    await criarNota(sessao.id, item.id, novaNota.trim());
    setNovaNota("");
  });

  return (
    <div style={{
      background:C.card, border:"1px solid "+(atrasado ? C.clay : C.line),
      borderLeft:"3px solid "+(pinf.cor || C.accent), borderRadius:10,
      boxShadow:SH, opacity: terminal ? 0.7 : 1,
    }}>
      {/* Cabeçalho compacto — clica pra expandir */}
      <div onClick={() => setAberto(a => !a)} style={{ padding:"10px 12px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={pill(pinf.cor)}>{pinf.label}</span>
          <span style={pill(sinf.cor)}>{sinf.label}</span>
          {atrasado && <span style={{ fontSize:10.5, fontWeight:700, color:C.clay }}>⏰ atrasado</span>}
          <span style={{ marginLeft:"auto", fontSize:12, color:C.muted }}>{aberto ? "▲" : "▼"}</span>
        </div>
        <div style={{ fontSize:14, fontWeight:600, color:C.ink, marginTop:6, whiteSpace:"pre-wrap", lineHeight:1.35 }}>{item.texto}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginTop:7 }}>
          <BarraProgresso feitas={feitas} total={etapas.length} />
          <div style={{ fontSize:11.5, color:C.muted, display:"flex", gap:10, flexWrap:"wrap" }}>
            {dono && <span>👤 {dono}</span>}
            {(item.inicio || item.prazo) && (
              <span>📅 {item.inicio ? fmtData(item.inicio) : "…"} → {item.prazo ? fmtData(item.prazo) : "sem prazo"}</span>
            )}
            {notas.length > 0 && <span>💬 {notas.length}</span>}
          </div>
        </div>
        {!aberto && ultimaNota && (
          <div style={{ fontSize:11.5, color:C.muted, marginTop:5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            <b style={{ color:C.brand2 }}>última obs.:</b> {ultimaNota.texto}
          </div>
        )}
      </div>

      {aberto && (
        <div style={{ borderTop:"1px solid "+C.line, padding:"10px 12px", display:"flex", flexDirection:"column", gap:12 }}>

          {/* Edição do projeto */}
          {edit ? (
            <div>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} style={{...inp, resize:"vertical", marginBottom:8}} />
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
                <div style={{ flex:"0 0 120px" }}>
                  <div style={lab}>Prioridade</div>
                  <select value={prioridade} onChange={e => setPrioridade(e.target.value)} style={inp}>
                    {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div style={{ flex:"0 0 130px" }}>
                  <div style={lab}>Início</div>
                  <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={inp} />
                </div>
                <div style={{ flex:"0 0 130px" }}>
                  <div style={lab}>Prazo</div>
                  <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={salvarEdicao} disabled={busy}
                  style={{ background:C.brand, color:"#fff", border:"none", borderRadius:7, padding:"6px 12px", fontSize:12.5, fontWeight:600, cursor:busy?"default":"pointer" }}>
                  {busy ? "salvando…" : "Salvar"}
                </button>
                <button onClick={() => { setEdit(false); setTexto(item.texto); }}
                  style={{ background:"transparent", color:C.muted, border:"1px solid "+C.line, borderRadius:7, padding:"6px 12px", fontSize:12.5, cursor:"pointer" }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {item.resolucao && (
                <div style={{ padding:"6px 8px", background:C.sage, border:"1px solid "+C.line, borderRadius:7, fontSize:12, color:C.ink }}>
                  <b style={{ color:C.brand }}>Resolução:</b> {item.resolucao}
                </div>
              )}
              {podeEscrever && (
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {STATUS.filter(s => s.id !== item.status).map(s => (
                    <button key={s.id} onClick={() => mudarStatus(s.id)} disabled={busy} title={"Mudar para "+s.label}
                      style={{ background: ehTerminal(s.id) ? s.cor : "transparent",
                        color: ehTerminal(s.id) ? "#fff" : s.cor,
                        border: ehTerminal(s.id) ? "none" : "1px solid "+s.cor,
                        borderRadius:6, padding:"3px 9px", fontSize:11.5, fontWeight:600, cursor:busy?"default":"pointer" }}>
                      → {s.label}
                    </button>
                  ))}
                  <button onClick={() => setEdit(true)}
                    style={{ marginLeft:"auto", background:"transparent", color:C.brand, border:"1px solid "+C.line, borderRadius:6, padding:"3px 9px", fontSize:11.5, cursor:"pointer" }}>
                    editar
                  </button>
                  <button onClick={apagar} disabled={busy}
                    style={{ background:"transparent", color:C.clay, border:"1px solid "+C.line, borderRadius:6, padding:"3px 9px", fontSize:11.5, cursor:busy?"default":"pointer" }}>
                    apagar
                  </button>
                </div>
              )}
            </>
          )}

          {semV3 ? (
            <div style={{ fontSize:12, color:C.muted, background:C.sage, border:"1px solid "+C.line, borderRadius:8, padding:"8px 10px" }}>
              ⚙ Pra habilitar <b>etapas</b> e <b>observações</b>, rode uma vez o <b>sql/chorei_v3.sql</b> no Supabase (SQL Editor) e recarregue.
            </div>
          ) : (
            <>
              {/* Etapas */}
              <div>
                <div style={{ fontSize:11.5, color:C.brand, fontWeight:700, textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>
                  Etapas {etapas.length > 0 && <span style={{ color:C.muted, fontWeight:600 }}>· {feitas}/{etapas.length}</span>}
                </div>
                {etapas.length === 0 && (
                  <div style={{ fontSize:12, color:C.muted, fontStyle:"italic", marginBottom:6 }}>
                    Sem etapas ainda. Quebre o projeto em passos pra acompanhar o progresso.
                  </div>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {etapas.map(e => {
                    const eAtrasada = e.prazo && e.prazo < hojeISO() && !e.feito;
                    const eDono = e.responsavel_nome || (usuarios.find(u => u.id === e.responsavel_id)?.nome) || null;
                    return (
                      <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px",
                        background:C.paper, border:"1px solid "+(eAtrasada ? C.clay : C.line), borderRadius:7 }}>
                        <input type="checkbox" checked={e.feito} disabled={!podeEscrever || busy}
                          onChange={ev => rode(() => marcarEtapa(sessao.id, e.id, ev.target.checked))()}
                          style={{ accentColor:C.accent, width:16, height:16, cursor:podeEscrever?"pointer":"default", flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:12.5, color:e.feito?C.muted:C.ink,
                          textDecoration:e.feito?"line-through":"none", lineHeight:1.3 }}>{e.texto}</span>
                        <span style={{ fontSize:11, color:eAtrasada?C.clay:C.muted, whiteSpace:"nowrap" }}>
                          {eDono && <>👤 {eDono} </>}
                          {e.prazo && <>📅 {fmtData(e.prazo)}</>}
                        </span>
                        {podeEscrever && (
                          <button onClick={() => { if (window.confirm("Apagar esta etapa?")) rode(() => apagarEtapa(sessao.id, e.id))(); }}
                            disabled={busy} title="Apagar etapa"
                            style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:13, padding:"0 2px", flexShrink:0 }}>
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {podeEscrever && !terminal && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                    <input value={novaEtapa.texto}
                      onChange={e => setNovaEtapa(n => ({ ...n, texto:e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") addEtapa(); }}
                      placeholder="Nova etapa…" style={{...inp, flex:"2 1 180px", width:"auto"}} />
                    {usuarios.length > 0 && (
                      <select value={novaEtapa.responsavel} onChange={e => setNovaEtapa(n => ({ ...n, responsavel:e.target.value }))}
                        style={{...inp, flex:"1 1 120px", width:"auto"}}>
                        <option value="">— dono —</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    )}
                    <input type="date" value={novaEtapa.prazo} onChange={e => setNovaEtapa(n => ({ ...n, prazo:e.target.value }))}
                      style={{...inp, flex:"0 0 125px", width:"auto"}} />
                    <button onClick={addEtapa} disabled={busy || !novaEtapa.texto.trim()}
                      style={{ background:C.accent, color:"#fff", border:"none", borderRadius:7, padding:"6px 12px",
                        fontSize:12.5, fontWeight:600, cursor:(busy||!novaEtapa.texto.trim())?"default":"pointer",
                        opacity:(busy||!novaEtapa.texto.trim())?.6:1 }}>
                      + Etapa
                    </button>
                  </div>
                )}
              </div>

              {/* Observações / diário */}
              <div>
                <div style={{ fontSize:11.5, color:C.brand, fontWeight:700, textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>
                  Observações {notas.length > 0 && <span style={{ color:C.muted, fontWeight:600 }}>· {notas.length}</span>}
                </div>
                {podeEscrever && !terminal && (
                  <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                    <input value={novaNota} onChange={e => setNovaNota(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addNota(); }}
                      placeholder="O que andou? O que travou? Registre aqui…" style={{...inp, flex:1, width:"auto"}} />
                    <button onClick={addNota} disabled={busy || !novaNota.trim()}
                      style={{ background:C.brand2, color:"#fff", border:"none", borderRadius:7, padding:"6px 12px",
                        fontSize:12.5, fontWeight:600, cursor:(busy||!novaNota.trim())?"default":"pointer",
                        opacity:(busy||!novaNota.trim())?.6:1 }}>
                      + Obs.
                    </button>
                  </div>
                )}
                {notas.length === 0 && (
                  <div style={{ fontSize:12, color:C.muted, fontStyle:"italic" }}>
                    Nenhuma observação ainda — o diário do projeto aparece aqui.
                  </div>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {notas.map(n => (
                    <div key={n.id} style={{ padding:n.auto?"4px 8px":"6px 8px", background:n.auto?"transparent":C.paper,
                      border:n.auto?"1px dashed "+C.line:"1px solid "+C.line, borderRadius:7 }}>
                      <div style={{ fontSize:n.auto?11.5:12.5, color:n.auto?C.muted:C.ink, fontStyle:n.auto?"italic":"normal",
                        whiteSpace:"pre-wrap", lineHeight:1.35 }}>{n.texto}</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:3 }}>
                        <span style={{ fontSize:10.5, color:C.muted }}>
                          {n.autor_nome || "—"} · {fmtDataHora(n.criado_em)}
                        </span>
                        {podeEscrever && (
                          <button onClick={() => { if (window.confirm("Apagar esta observação?")) rode(() => apagarNota(sessao.id, n.id))(); }}
                            disabled={busy} title="Apagar observação"
                            style={{ marginLeft:"auto", background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:12, padding:0 }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
