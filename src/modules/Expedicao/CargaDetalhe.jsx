import React from "react";
const { useState } = React;
import { C, SERIF } from "../../constants.js";
import { sb } from "../../db.js";
import { S, Campo, BtnMini } from "../operacionais/Common.jsx";
import { SECOES, rotuloStatusCarga, corStatusCarga, rotuloStatusItem } from "./expedicaoconst.js";

const BUCKET = "exp_fotos";
async function uploadFotoExp(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = Date.now() + "-" + Math.random().toString(36).slice(2,8) + "." + ext;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert:false, contentType:file.type || undefined });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const OPCOES = [["conforme","✓ Conforme"],["nao_conforme","✕ Não conforme"],["na","N.A."]];

function ItemRow({ resposta, onSalvar, bloqueadaLeitura }) {
  const [obs, setObs] = useState(resposta.observacao || "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const marcar = async (status) => {
    setErro("");
    try { await onSalvar(resposta.id, { status, observacao: obs, foto_url: null }); }
    catch (e) { setErro(e.message || String(e)); }
  };
  const salvarObs = async () => {
    if (obs === (resposta.observacao || "")) return;
    setErro("");
    try { await onSalvar(resposta.id, { status: resposta.status, observacao: obs, foto_url: null }); }
    catch (e) { setErro(e.message || String(e)); }
  };
  const subirFoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setEnviando(true); setErro("");
    try {
      const url = await uploadFotoExp(f);
      await onSalvar(resposta.id, { status: resposta.status, observacao: obs, foto_url: url });
    } catch (err) { setErro(err.message || String(err)); }
    setEnviando(false); if (e.target) e.target.value = "";
  };

  return (
    <div style={{ ...S.card, padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:14, color:C.ink, fontWeight:600, flex:"1 1 220px" }}>{resposta.titulo}</span>
        {resposta.critico && <span style={{ fontSize:10.5, fontWeight:700, color:"#fff", background:C.clay, borderRadius:6, padding:"2px 7px", whiteSpace:"nowrap" }}>CRÍTICO</span>}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {OPCOES.map(([id,label]) => (
          <button key={id} disabled={bloqueadaLeitura} onClick={()=>marcar(id)}
            style={{
              padding:"7px 12px", borderRadius:8, fontSize:12.5, fontWeight:700, cursor:bloqueadaLeitura?"default":"pointer",
              border:"1px solid "+(resposta.status===id ? corBtn(id) : C.line),
              background: resposta.status===id ? corBtn(id) : "transparent",
              color: resposta.status===id ? "#fff" : C.muted,
            }}>{label}</button>
        ))}
      </div>
      <input value={obs} onChange={e=>setObs(e.target.value)} onBlur={salvarObs} disabled={bloqueadaLeitura}
        placeholder="Observação (opcional)" style={S.input} />
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        {!bloqueadaLeitura && (
          <label style={{ background:C.sage, color:C.brand, border:"1px solid "+C.line, borderRadius:8, padding:"6px 11px", fontSize:12.5, cursor:"pointer", fontWeight:600 }}>
            {enviando ? "enviando…" : "+ Foto"}
            <input type="file" accept="image/*" onChange={subirFoto} style={{ display:"none" }} />
          </label>
        )}
        {resposta.foto_url && (
          <a href={resposta.foto_url} target="_blank" rel="noreferrer">
            <img src={resposta.foto_url} alt="Foto do item" style={{ width:54, height:54, objectFit:"cover", borderRadius:8, border:"1px solid "+C.line, display:"block" }} />
          </a>
        )}
      </div>
      {erro && <div style={{ fontSize:12.5, color:C.clay }}>{erro}</div>}
    </div>
  );
}
const corBtn = (status) => status==="nao_conforme" ? C.clay : status==="na" ? C.muted : C.green;

function Secao({ secao, titulo, itens, responsavelNome, respondidoEm, onSalvarItem, onConcluir, jaFechada }) {
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const pendentes = itens.filter(i=>i.status==="pendente").length;

  const concluir = async () => {
    setErro("");
    if (!nome.trim()) { setErro("Informe seu nome para concluir a conferência."); return; }
    setBusy(true);
    try { await onConcluir(secao, nome.trim()); }
    catch (e) { setErro(e.message || String(e)); }
    setBusy(false);
  };

  return (
    <div style={{ marginTop:22 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
        <h3 style={{ fontFamily:SERIF, fontSize:16, color:C.brand, margin:0 }}>{titulo}</h3>
        {jaFechada
          ? <span style={{ fontSize:12.5, color:C.green, fontWeight:600 }}>✓ Conferido por {responsavelNome} em {new Date(respondidoEm).toLocaleString("pt-BR")}</span>
          : <span style={{ fontSize:12.5, color:C.muted }}>{pendentes>0 ? pendentes+" item(ns) pendente(s)" : "Todos os itens respondidos"}</span>}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {itens.map(r => <ItemRow key={r.id} resposta={r} onSalvar={onSalvarItem} bloqueadaLeitura={jaFechada} />)}
        {!itens.length && <div style={{ fontSize:13, color:C.muted }}>Nenhum item cadastrado nesta seção.</div>}
      </div>
      {!jaFechada && (
        <div style={{ ...S.card, marginTop:10, display:"flex", gap:10, flexWrap:"wrap", alignItems:"end" }}>
          <Campo label="Responsável pela conferência"><input value={nome} onChange={e=>setNome(e.target.value)} style={S.input} /></Campo>
          <button onClick={concluir} disabled={busy || pendentes>0} title={pendentes>0?"Responda todos os itens antes de concluir":undefined}
            style={{ ...S.btn, opacity:(busy||pendentes>0)?0.6:1 }}>{busy?"salvando…":"Concluir seção"}</button>
          {erro && <div style={{ fontSize:12.5, color:C.clay, width:"100%" }}>{erro}</div>}
        </div>
      )}
    </div>
  );
}

export function CargaDetalhe({ carga, respostas, onSalvarItem, onConcluirSecao, onCancelar, onFechar }) {
  const itensAntes = respostas.filter(r=>r.secao==="antes").sort((a,b)=>a.ordem-b.ordem);
  const itensDepois = respostas.filter(r=>r.secao==="depois").sort((a,b)=>a.ordem-b.ordem);

  const imprimir = () => {
    document.body.classList.add("exp-printing");
    const limpar = () => { document.body.classList.remove("exp-printing"); window.removeEventListener("afterprint", limpar); };
    window.addEventListener("afterprint", limpar);
    window.print();
    setTimeout(limpar, 1500);
  };

  return (
    <div onClick={onFechar} style={{ position:"fixed", inset:0, background:"rgba(28,42,54,.5)", zIndex:100, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px", overflowY:"auto" }}>
    <div onClick={e=>e.stopPropagation()} style={{ ...S.card, width:"100%", maxWidth:760 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <span style={{ fontFamily:SERIF, fontSize:19, color:C.brand }}>Carga {carga.numero || "—"}</span>
        <span style={{ fontSize:11.5, fontWeight:700, color:"#fff", background:corStatusCarga(carga.status), borderRadius:6, padding:"3px 9px" }}>{rotuloStatusCarga(carga.status)}</span>
        {carga.cancelado && <span style={{ fontSize:11.5, fontWeight:700, color:C.clay }}>Cancelada</span>}
      </div>

      <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginTop:10, fontSize:13, color:C.ink }}>
        <span><span style={{ color:C.muted }}>Data: </span><b>{new Date(carga.data+"T00:00:00").toLocaleDateString("pt-BR")}</b></span>
        <span><span style={{ color:C.muted }}>Placa: </span><b>{carga.placa || "—"}</b></span>
        <span><span style={{ color:C.muted }}>Motorista: </span><b>{carga.motorista || "—"}</b></span>
        <span><span style={{ color:C.muted }}>Transportadora: </span><b>{carga.transportadora || "—"}</b></span>
        <span><span style={{ color:C.muted }}>Destino: </span><b>{carga.destino || "—"}</b></span>
      </div>

      {carga.status === "bloqueada" && (
        <div style={{ marginTop:14, padding:10, background:"#FBEAE3", color:C.clay, border:"1px solid "+C.clay, borderRadius:9, fontSize:13, fontWeight:600 }}>
          ⚠ Carga bloqueada — há item crítico reprovado. Corrija o item para liberar o despacho.
        </div>
      )}

      {carga.cancelado ? (
        <div style={{ marginTop:14, padding:10, background:C.sage, color:C.muted, border:"1px solid "+C.line, borderRadius:9, fontSize:13 }}>
          Esta carga foi cancelada e não pode mais ser alterada.
        </div>
      ) : (
        <>
          <Secao secao="antes" titulo="Antes do carregamento" itens={itensAntes}
            responsavelNome={carga.responsavel_antes} respondidoEm={carga.respondido_antes_em}
            jaFechada={!!carga.respondido_antes_em} onSalvarItem={onSalvarItem} onConcluir={onConcluirSecao} />
          <Secao secao="depois" titulo="Depois do carregamento" itens={itensDepois}
            responsavelNome={carga.responsavel_depois} respondidoEm={carga.respondido_depois_em}
            jaFechada={!!carga.respondido_depois_em} onSalvarItem={onSalvarItem} onConcluir={onConcluirSecao} />
        </>
      )}

      <div style={{ display:"flex", gap:10, marginTop:20, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={imprimir} style={{ ...S.btn2, display:"inline-flex", alignItems:"center", gap:6 }}><span aria-hidden>🖨</span> Imprimir</button>
        {!carga.cancelado && <BtnMini cor={C.clay} onClick={onCancelar}>Cancelar carga</BtnMini>}
        <button onClick={onFechar} style={{ ...S.btn2, marginLeft:"auto" }}>Fechar</button>
      </div>

      {/* Layout de impressão (A4) — escondido na tela, visível só ao imprimir */}
      <div className="exp-print" style={{ fontFamily:"Georgia,serif", fontSize:12, lineHeight:1.5 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"2px solid #000", paddingBottom:8, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700 }}>Check List Expedição — Carga {carga.numero || "—"}</div>
            <div style={{ fontSize:12 }}>Sementes Veneza</div>
          </div>
          <div style={{ textAlign:"right", fontSize:12 }}>
            <div>Status: <b>{rotuloStatusCarga(carga.status)}</b></div>
            <div>{new Date(carga.data+"T00:00:00").toLocaleDateString("pt-BR")}</div>
          </div>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, marginBottom:12 }}>
          <tbody>
            <tr><td style={{ padding:"3px 0", width:"50%" }}><b>Placa:</b> {carga.placa || "—"}</td><td style={{ padding:"3px 0" }}><b>Motorista:</b> {carga.motorista || "—"}</td></tr>
            <tr><td style={{ padding:"3px 0" }}><b>Transportadora:</b> {carga.transportadora || "—"}</td><td style={{ padding:"3px 0" }}><b>Destino:</b> {carga.destino || "—"}</td></tr>
          </tbody>
        </table>
        {SECOES.map(([id,label]) => (
          <div key={id} style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, borderBottom:"1px solid #000", marginBottom:4 }}>{label}</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11.5 }}>
              <thead><tr>
                <th style={{ textAlign:"left", padding:"2px 4px" }}>Item</th>
                <th style={{ textAlign:"left", padding:"2px 4px" }}>Status</th>
                <th style={{ textAlign:"left", padding:"2px 4px" }}>Observação</th>
              </tr></thead>
              <tbody>
                {respostas.filter(r=>r.secao===id).sort((a,b)=>a.ordem-b.ordem).map(r=>(
                  <tr key={r.id}><td style={{ padding:"2px 4px" }}>{r.titulo}{r.critico?" ★":""}</td><td style={{ padding:"2px 4px" }}>{rotuloStatusItem(r.status)}</td><td style={{ padding:"2px 4px" }}>{r.observacao || ""}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop:4, fontSize:11.5 }}>
              Conferido por: {id==="antes" ? (carga.responsavel_antes||"—") : (carga.responsavel_depois||"—")}
              {" "}em {id==="antes" ? (carga.respondido_antes_em? new Date(carga.respondido_antes_em).toLocaleString("pt-BR"):"—") : (carga.respondido_depois_em? new Date(carga.respondido_depois_em).toLocaleString("pt-BR"):"—")}
            </div>
          </div>
        ))}
        <div style={{ marginTop:20, fontSize:11 }}>★ item crítico</div>
      </div>
    </div>
    </div>
  );
}
