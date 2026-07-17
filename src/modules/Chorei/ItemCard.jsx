import React from "react";
const { useState } = React;
import { C, SH } from "../../constants.js";
import { TIPOS, STATUS, tipoInfo, statusInfo, prioridadeInfo, ehProjeto, ehTerminal, fmtData, fmtDataHora, hojeISO } from "./choreiconst.js";
import { atualizarItem, apagarItem } from "./choreidb.js";

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"7px 10px", fontSize:13, background:C.paper, color:C.ink, width:"100%" };
const lab = { fontSize:11, color:C.muted, fontWeight:600, marginBottom:3 };

export function ItemCard({ item, sessao, usuarios, podeEscrever, recarregar, onErro, mostrarEquipe }) {
  const [edit, setEdit] = useState(false);
  const [texto,   setTexto]   = useState(item.texto);
  const [resp,    setResp]    = useState(item.responsavel_id || "");
  const [prazo,   setPrazo]   = useState(item.prazo || "");
  const [resolucao, setResolucao] = useState(item.resolucao || "");
  const [busy, setBusy] = useState(false);

  const tinf = tipoInfo(item.tipo);
  const sinf = statusInfo(item.status);
  const isPrazoVencido = item.prazo && item.prazo < hojeISO() && !ehTerminal(item.status);

  const salvar = async (statusNovo) => {
    setBusy(true);
    try {
      const respUser = usuarios.find(u => u.id === resp);
      await atualizarItem(sessao.id, item.id, {
        texto,
        responsavelId: resp || null,
        responsavelNome: respUser?.nome ?? item.responsavel_nome ?? null,
        prazo: prazo || null,
        status: statusNovo ?? null,
        resolucao: statusNovo && ehTerminal(statusNovo) ? (resolucao || null) : null,
      });
      setEdit(false);
      await recarregar();
    } catch (err) { onErro?.(err.message || String(err)); }
    setBusy(false);
  };

  const mudarStatus = async (novo) => {
    if (ehTerminal(novo)) {
      const r = window.prompt(`Como foi resolvido? (opcional)`);
      if (r === null) return;
      setBusy(true);
      try {
        await atualizarItem(sessao.id, item.id, { status: novo, resolucao: r || null });
        await recarregar();
      } catch (err) { onErro?.(err.message || String(err)); }
      setBusy(false);
    } else {
      setBusy(true);
      try { await atualizarItem(sessao.id, item.id, { status: novo }); await recarregar(); }
      catch (err) { onErro?.(err.message || String(err)); }
      setBusy(false);
    }
  };

  const apagar = async () => {
    if (!window.confirm("Apagar este item?")) return;
    setBusy(true);
    try { await apagarItem(sessao.id, item.id); await recarregar(); }
    catch (err) { onErro?.(err.message || String(err)); }
    setBusy(false);
  };

  const dono = item.responsavel_nome || (usuarios.find(u => u.id === item.responsavel_id)?.nome) || null;

  return (
    <div style={{
      background:C.card, border:"1px solid "+(isPrazoVencido ? C.clay : C.line),
      borderLeft:"3px solid "+(tinf.cor || C.brand), borderRadius:10, padding:"9px 11px",
      boxShadow:SH, opacity: ehTerminal(item.status) ? 0.7 : 1,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:4 }}>
        <span style={{ fontSize:10.5, fontWeight:700, color:"#fff", background:tinf.cor, borderRadius:20, padding:"2px 8px" }}>
          {tinf.icone} {tinf.label}
        </span>
        <span style={{ fontSize:10.5, fontWeight:700, color:"#fff", background:sinf.cor, borderRadius:20, padding:"2px 8px" }}>
          {sinf.label}
        </span>
        {ehProjeto(item) && item.prioridade && (
          <span style={{ fontSize:10.5, fontWeight:700, color:"#fff", background:prioridadeInfo(item.prioridade).cor, borderRadius:20, padding:"2px 8px" }}>
            {prioridadeInfo(item.prioridade).label}
          </span>
        )}
        {mostrarEquipe && item._equipeNome && (
          <span style={{ fontSize:10.5, fontWeight:700, color:"#fff", background:item._equipeCor||C.brand, borderRadius:20, padding:"2px 8px" }}>
            {item._equipeNome}
          </span>
        )}
        {isPrazoVencido && (
          <span style={{ fontSize:10.5, fontWeight:700, color:C.clay }}>⏰ atrasado</span>
        )}
        <span style={{ marginLeft:"auto", fontSize:11, color:C.muted }}>{fmtDataHora(item.criado_em)}</span>
      </div>

      {edit ? (
        <>
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
          <div style={{ fontSize:13.5, color:C.ink, whiteSpace:"pre-wrap", lineHeight:1.35 }}>{item.texto}</div>
          <div style={{ fontSize:11.5, color:C.muted, marginTop:5, display:"flex", gap:10, flexWrap:"wrap" }}>
            {dono && <span>👤 {dono}</span>}
            {item.prazo && <span>📅 {fmtData(item.prazo)}</span>}
            {item.autor_nome && <span style={{ marginLeft:"auto" }}>criado por {item.autor_nome}</span>}
          </div>
          {item.resolucao && (
            <div style={{ marginTop:6, padding:"6px 8px", background:C.sage, border:"1px solid "+C.line, borderRadius:7, fontSize:12, color:C.ink }}>
              <b style={{ color:C.brand }}>Resolução:</b> {item.resolucao}
            </div>
          )}
          {podeEscrever && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:8, borderTop:"1px dashed "+C.line, paddingTop:8 }}>
              {STATUS.filter(s => s.id !== item.status && (!s.soProjeto || ehProjeto(item))).map(s => (
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
    </div>
  );
}
