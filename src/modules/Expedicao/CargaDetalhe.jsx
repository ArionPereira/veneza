import React from "react";
import { createPortal } from "react-dom";
const { useState } = React;
import { C, SERIF } from "../../constants.js";
import { sb } from "../../db.js";
import { S, Campo, BtnMini } from "../operacionais/Common.jsx";
import { rotuloStatusCarga, corStatusCarga } from "./expedicaoconst.js";

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
const corBtn = (status) => status==="nao_conforme" ? C.clay : status==="na" ? C.muted : C.green;

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
          <>
            {/* capture abre direto a câmera no celular; sem capture abre a galeria */}
            <label style={{ background:C.sage, color:C.brand, border:"1px solid "+C.line, borderRadius:8, padding:"6px 11px", fontSize:12.5, cursor:"pointer", fontWeight:600 }}>
              {enviando ? "enviando…" : "📷 Câmera"}
              <input type="file" accept="image/*" capture="environment" onChange={subirFoto} style={{ display:"none" }} />
            </label>
            <label style={{ background:C.sage, color:C.brand, border:"1px solid "+C.line, borderRadius:8, padding:"6px 11px", fontSize:12.5, cursor:"pointer", fontWeight:600 }}>
              {enviando ? "enviando…" : "🖼 Galeria"}
              <input type="file" accept="image/*" onChange={subirFoto} style={{ display:"none" }} />
            </label>
          </>
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

function Secao({ cs, itens, aberta, onToggle, anteriorPendente, onSalvarItem, onConcluir }) {
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const jaFechada = !!cs.concluida_em;
  const respondidos = itens.filter(i=>i.status!=="pendente").length;
  const pendentes = itens.length - respondidos;

  const concluir = async () => {
    setErro("");
    if (!nome.trim()) { setErro("Informe seu nome para concluir a conferência."); return; }
    setBusy(true);
    try { await onConcluir(cs.id, nome.trim()); }
    catch (e) { setErro(e.message || String(e)); }
    setBusy(false);
  };

  return (
    <div style={{ marginTop:14, border:"1px solid "+(jaFechada?C.green:C.line), borderRadius:12, overflow:"hidden" }}>
      {/* Cabeçalho recolhível */}
      <button onClick={onToggle} style={{ width:"100%", textAlign:"left", background:jaFechada?"#EFF7EE":C.sage, border:"none", padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <span style={{ fontSize:14, color:C.muted, flex:"0 0 auto" }}>{aberta ? "▾" : "▸"}</span>
        <span style={{ fontFamily:SERIF, fontSize:15.5, color:C.brand, fontWeight:600, flex:"1 1 auto" }}>{cs.nome}</span>
        {jaFechada
          ? <span style={{ fontSize:12, color:C.green, fontWeight:700 }}>✓ {cs.responsavel} · {new Date(cs.concluida_em).toLocaleString("pt-BR")}</span>
          : anteriorPendente
            ? <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>🔒 aguarda seção anterior</span>
            : <span style={{ fontSize:12, color:pendentes>0?C.clay:C.green, fontWeight:600 }}>{respondidos}/{itens.length} respondidos</span>}
      </button>

      {aberta && (
        <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
          {itens.map(r => <ItemRow key={r.id} resposta={r} onSalvar={onSalvarItem} bloqueadaLeitura={jaFechada} />)}
          {!itens.length && <div style={{ fontSize:13, color:C.muted }}>Nenhum item nesta seção.</div>}
          {!jaFechada && (
            <div style={{ ...S.card, display:"flex", gap:10, flexWrap:"wrap", alignItems:"end" }}>
              <Campo label="Responsável pela conferência"><input value={nome} onChange={e=>setNome(e.target.value)} style={S.input} /></Campo>
              <button onClick={concluir} disabled={busy || pendentes>0 || anteriorPendente}
                title={anteriorPendente ? "Conclua primeiro a seção anterior" : pendentes>0 ? "Responda todos os itens antes de concluir" : undefined}
                style={{ ...S.btn, opacity:(busy||pendentes>0||anteriorPendente)?0.6:1 }}>{busy?"salvando…":"Concluir seção"}</button>
              {anteriorPendente && <div style={{ fontSize:12.5, color:C.muted, width:"100%" }}>🔒 Esta seção só pode ser concluída depois da anterior. Os itens já podem ser respondidos.</div>}
              {erro && <div style={{ fontSize:12.5, color:C.clay, width:"100%" }}>{erro}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CargaDetalhe({ carga, cargaSecoes, respostas, onSalvarItem, onConcluirSecao, onCancelar, onFechar }) {
  const secoes = cargaSecoes.slice().sort((a,b)=>a.ordem-b.ordem || new Date(a.criado_em)-new Date(b.criado_em));
  // abre por padrão só a primeira seção ainda não concluída; o resto fica recolhido
  const [abertas, setAbertas] = useState(() => {
    const prox = secoes.find(s => !s.concluida_em);
    return prox ? { [prox.id]: true } : {};
  });
  const toggle = (id) => setAbertas(a => ({ ...a, [id]: !a[id] }));
  const itensDe = (cs) => respostas.filter(r => r.carga_secao_id === cs.id).sort((a,b)=>a.ordem-b.ordem);
  const secaoPorId = Object.fromEntries(secoes.map(cs => [cs.id, cs]));

  const concluirEAvancar = async (csId, responsavel) => {
    await onConcluirSecao(csId, responsavel);
    // recolhe a seção concluída e abre a próxima
    const i = secoes.findIndex(s => s.id === csId);
    const prox = secoes[i+1];
    setAbertas(a => ({ ...a, [csId]: false, ...(prox ? { [prox.id]: true } : {}) }));
  };

  const imprimir = () => {
    document.body.classList.add("exp-printing");
    const limpar = () => { document.body.classList.remove("exp-printing"); window.removeEventListener("afterprint", limpar); };
    window.addEventListener("afterprint", limpar);
    window.print();
    setTimeout(limpar, 1500);
  };

  return (
    <div onClick={onFechar} className="exp-overlay" style={{ position:"fixed", inset:0, background:"rgba(28,42,54,.5)", zIndex:100, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px", overflowY:"auto" }}>
    <div onClick={e=>e.stopPropagation()} className="exp-card" style={{ ...S.card, width:"100%", maxWidth:760 }}>
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
        <div style={{ marginTop:8 }}>
          {secoes.map((cs, i) => (
            <Secao key={cs.id} cs={cs} itens={itensDe(cs)}
              aberta={!!abertas[cs.id]} onToggle={()=>toggle(cs.id)}
              anteriorPendente={secoes.slice(0,i).some(s=>!s.concluida_em)}
              onSalvarItem={onSalvarItem} onConcluir={concluirEAvancar} />
          ))}
          {!secoes.length && <div style={{ fontSize:13, color:C.muted, marginTop:10 }}>Esta carga não tem seções (modelo estava vazio quando foi criada).</div>}
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginTop:20, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={imprimir} style={{ ...S.btn2, display:"inline-flex", alignItems:"center", gap:6 }}><span aria-hidden>🖨</span> Imprimir</button>
        {!carga.cancelado && <BtnMini cor={C.clay} onClick={onCancelar}>Cancelar carga</BtnMini>}
        <button onClick={onFechar} style={{ ...S.btn2, marginLeft:"auto" }}>Fechar</button>
      </div>

      {/* Layout de impressão (A4) — portal no body, escondido na tela, visível só ao imprimir */}
      {typeof document !== "undefined" && createPortal(
      <div className="exp-print" style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:12, lineHeight:1.45, color:"#000" }}>
        {/* Cabeçalho */}
        <table style={{ width:"100%", borderCollapse:"collapse", borderBottom:"3px double #000", marginBottom:10 }}><tbody><tr>
          <td style={{ padding:"0 0 8px", verticalAlign:"middle" }}>
            {typeof window!=="undefined" && window.LOGO && <img src={window.LOGO} alt="Sementes Veneza" style={{ height:52 }} />}
          </td>
          <td style={{ padding:"0 0 8px", textAlign:"center", verticalAlign:"middle" }}>
            <div style={{ fontSize:17, fontWeight:700, letterSpacing:.3 }}>CHECK LIST DE EXPEDIÇÃO</div>
            <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase" }}>Sementes Veneza</div>
          </td>
          <td style={{ padding:"0 0 8px", textAlign:"right", verticalAlign:"middle", whiteSpace:"nowrap" }}>
            <div style={{ fontSize:15, fontWeight:700 }}>Carga Nº {carga.numero || "—"}</div>
            <div style={{ fontSize:11.5 }}>{new Date(carga.data+"T00:00:00").toLocaleDateString("pt-BR")}</div>
            <div style={{ fontSize:11.5 }}>Situação: <b>{carga.cancelado ? "CANCELADA" : rotuloStatusCarga(carga.status).toUpperCase()}</b></div>
          </td>
        </tr></tbody></table>

        {/* Identificação da carga */}
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11.5, marginBottom:14 }}><tbody>
          <tr>
            <td style={{ border:"1px solid #000", padding:"5px 8px", width:"25%" }}><span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:.5 }}>Placa</span><div style={{ fontWeight:700, fontSize:12.5 }}>{carga.placa || "—"}</div></td>
            <td style={{ border:"1px solid #000", padding:"5px 8px", width:"25%" }}><span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:.5 }}>Motorista</span><div style={{ fontWeight:700, fontSize:12.5 }}>{carga.motorista || "—"}</div></td>
            <td style={{ border:"1px solid #000", padding:"5px 8px", width:"25%" }}><span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:.5 }}>Transportadora</span><div style={{ fontWeight:700, fontSize:12.5 }}>{carga.transportadora || "—"}</div></td>
            <td style={{ border:"1px solid #000", padding:"5px 8px", width:"25%" }}><span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:.5 }}>Destino/cliente</span><div style={{ fontWeight:700, fontSize:12.5 }}>{carga.destino || "—"}</div></td>
          </tr>
        </tbody></table>

        {/* Seções */}
        {secoes.map(cs => {
          const itens = itensDe(cs);
          return (
            <div key={cs.id} style={{ marginBottom:16 }}>
              <div style={{ background:"#000", color:"#fff", fontSize:11.5, fontWeight:700, textTransform:"uppercase", letterSpacing:1, padding:"4px 8px" }}>{cs.nome}</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead><tr>
                  <th style={{ border:"1px solid #000", padding:"3px 6px", width:24, textAlign:"center" }}>Nº</th>
                  <th style={{ border:"1px solid #000", padding:"3px 6px", textAlign:"left" }}>Item de verificação</th>
                  <th style={{ border:"1px solid #000", padding:"3px 6px", width:78, textAlign:"center" }}>Resultado</th>
                  <th style={{ border:"1px solid #000", padding:"3px 6px", textAlign:"left", width:"30%" }}>Observação</th>
                </tr></thead>
                <tbody>
                  {itens.map((r,i)=>(
                    <tr key={r.id}>
                      <td style={{ border:"1px solid #000", padding:"3px 6px", textAlign:"center" }}>{i+1}</td>
                      <td style={{ border:"1px solid #000", padding:"3px 6px" }}>{r.titulo}{r.critico && <b> (crítico)</b>}</td>
                      <td style={{ border:"1px solid #000", padding:"3px 6px", textAlign:"center", fontWeight:700 }}>
                        {r.status==="conforme" ? "✔ Conforme" : r.status==="nao_conforme" ? "✘ NÃO CONF." : r.status==="na" ? "N.A." : "—"}
                      </td>
                      <td style={{ border:"1px solid #000", padding:"3px 6px" }}>{r.observacao || ""}{r.foto_url ? (r.observacao?" · ":"")+"foto anexada" : ""}</td>
                    </tr>
                  ))}
                  {!itens.length && <tr><td colSpan={4} style={{ border:"1px solid #000", padding:"3px 6px" }}>Nenhum item.</td></tr>}
                </tbody>
              </table>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, marginTop:-1 }}><tbody><tr>
                <td style={{ border:"1px solid #000", padding:"4px 6px", width:"40%" }}><b>Conferido por:</b> {cs.responsavel || ""}</td>
                <td style={{ border:"1px solid #000", padding:"4px 6px", width:"28%" }}><b>Data/hora:</b> {cs.concluida_em ? new Date(cs.concluida_em).toLocaleString("pt-BR") : ""}</td>
                <td style={{ border:"1px solid #000", padding:"4px 6px" }}><b>Assinatura:</b></td>
              </tr></tbody></table>
            </div>
          );
        })}

        {/* Fotos anexadas */}
        {respostas.some(r=>r.foto_url) && (
          <div style={{ marginBottom:16 }}>
            <div style={{ background:"#000", color:"#fff", fontSize:11.5, fontWeight:700, textTransform:"uppercase", letterSpacing:1, padding:"4px 8px" }}>Registros fotográficos</div>
            <div style={{ border:"1px solid #000", borderTop:"none", padding:8, display:"flex", flexWrap:"wrap", gap:8 }}>
              {respostas.filter(r=>r.foto_url).map(r=>(
                <div key={r.id} style={{ width:150 }}>
                  <img src={r.foto_url} alt={r.titulo} style={{ width:150, height:110, objectFit:"cover", border:"1px solid #000", display:"block" }} />
                  <div style={{ fontSize:9, marginTop:2 }}>{secaoPorId[r.carga_secao_id]?.nome || ""} · {r.titulo}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #000", paddingTop:5, fontSize:9.5 }}>
          <span>Documento gerado pelo aplicativo Sementes Veneza · Check List Expedição</span>
          <span>Impresso em {new Date().toLocaleString("pt-BR")}</span>
        </div>
      </div>, document.body)}
    </div>
    </div>
  );
}
