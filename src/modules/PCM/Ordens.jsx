import React from "react";
const { useState, useEffect, useCallback } = React;
import { C, SH, SH2, SERIF } from "../../constants.js";
import { STATUS, TIPOS, FOTO_TIPOS, PRIORIDADES, ORDEM_STATUS, statusLabel, statusCor, tipoLabel, tipoCor, prioLabel, prioCor, critCor, fmtDataHora, fmtDataBR, fmtDuracao, difMs } from "./pcmconst.js";
import { addOrdem, mudarStatus, fecharOrdem, cancelarOrdem, listFotos, addFoto, removeFoto, uploadFoto, listHistorico, registrarHistorico } from "./pcmdb.js";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";

// reversão = sair de terminal (concluída/cancelada) ou voltar no fluxo principal
const ehReversao = (de, para) =>
  (de==="concluida" || de==="cancelada") ||
  (ORDEM_STATUS[para]!=null && ORDEM_STATUS[de]!=null && ORDEM_STATUS[para] < ORDEM_STATUS[de]);

const msgReversao = (de, para) =>
  de==="concluida" ? "Reabrir esta OS? A conclusão será desfeita (causa raiz, solução e tempo são preservados)." :
  de==="cancelada" ? "Reativar esta OS cancelada?" :
  'Voltar a OS para "'+statusLabel(para)+'"? Tem certeza?';

// aplica a transição p/ status não-terminal (concluir/cancelar têm forma própria)
async function transicionar(os, para, usuario) {
  const extra = {};
  if (para==="executando" && !os.iniciada_em) extra.iniciada_em = new Date().toISOString();
  if (os.status==="concluida" && para!=="concluida") extra.concluida_em = null;
  await mudarStatus(os.id, para, extra);
  await registrarHistorico({ os_id:os.id, de_status:os.status, para_status:para, usuario_id:usuario?.id||null, usuario_nome:usuario?.nome||null });
}

const fotoLabel = (id) => (FOTO_TIPOS.find(t=>t.id===id)||{}).label || id;
// nome do usuário pela FK, caindo no texto legado (solicitante) p/ OS antigas
const nomeUsuario = (id, usuarios) => { const u=(usuarios||[]).find(x=>x.id===id); return u?u.nome:null; };
const nomeComponente = (id, componentes) => { const c=(componentes||[]).find(x=>x.id===id); return c?c.nome:null; };

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"9px 11px", fontSize:14, background:C.paper, color:C.ink, width:"100%" };
const lab = { fontSize:12, color:C.muted, fontWeight:600, margin:"10px 0 4px" };
const dataCurta = (iso) => { try { return new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}); } catch(e){ return ""; } };
const ehTerminal = (s) => s==="concluida" || s==="cancelada";

function Pill({ texto, cor }) {
  return <span style={{display:"inline-block",fontSize:10.5,fontWeight:700,color:"#fff",background:cor,borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap"}}>{texto}</span>;
}

// ---------------------------------------------------------------------------
// Abrir OS (modal)
// ---------------------------------------------------------------------------
export function FormOS({ setores, equipamentos, componentes, usuario, equipPre, onFechar, onSalvo }) {
  const [equipId, setEquipId] = useState(equipPre || "");
  const [compId,  setCompId]  = useState("");
  const [tipo,    setTipo]    = useState("corretiva");
  const [prio,    setPrio]    = useState("media");
  const [planej,  setPlanej]  = useState("");
  const [titulo,  setTitulo]  = useState("");
  const [descr,   setDescr]   = useState("");
  const [salvando,setSalvando]= useState(false);
  const [erro,    setErro]    = useState("");

  const grupos = setores.map(s=>({ s, itens:equipamentos.filter(e=>e.setor_id===s.id) })).filter(g=>g.itens.length);
  const semSetor = equipamentos.filter(e=>!e.setor_id || !setores.some(s=>s.id===e.setor_id));
  const compsDoEquip = (componentes||[]).filter(c=>c.equipamento_id===equipId && c.ativo);

  const trocaEquip = (id) => { setEquipId(id); setCompId(""); };

  const salvar = async () => {
    if (!equipId)       { setErro("Escolha o equipamento."); return; }
    if (!titulo.trim()) { setErro("Informe um título."); return; }
    setErro(""); setSalvando(true);
    try {
      await addOrdem({ equipamento_id:equipId, componente_id:compId||null, tipo, prioridade:prio, planejada_para:planej||null, titulo:titulo.trim(), descricao:descr.trim()||null, status:"aberta", aberta_por_id:usuario?.id||null });
      await onSalvo(); onFechar();
    } catch(err){ setErro(String(err.message||err)); setSalvando(false); }
  };

  return (
    <div onClick={onFechar} style={{position:"fixed",inset:0,background:"rgba(28,42,54,.5)",zIndex:100,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:14,border:"1px solid "+C.line,boxShadow:SH2,width:"100%",maxWidth:480,padding:"20px 22px"}}>
        <div style={{fontFamily:SERIF,fontSize:18,color:C.brand,marginBottom:4}}>Abrir ordem de serviço</div>

        <div style={lab}>Equipamento *</div>
        <select value={equipId} onChange={e=>trocaEquip(e.target.value)} style={inp}>
          <option value="">— escolha —</option>
          {grupos.map(g=>(
            <optgroup key={g.s.id} label={g.s.nome}>
              {g.itens.map(e=><option key={e.id} value={e.id}>{e.tag} · {e.nome}</option>)}
            </optgroup>
          ))}
          {semSetor.length>0 && <optgroup label="Sem setor">{semSetor.map(e=><option key={e.id} value={e.id}>{e.tag} · {e.nome}</option>)}</optgroup>}
        </select>

        {compsDoEquip.length>0 && (<>
          <div style={lab}>Componente com defeito (opcional)</div>
          <select value={compId} onChange={e=>setCompId(e.target.value)} style={inp}>
            <option value="">— nenhum / não se aplica —</option>
            {compsDoEquip.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </>)}

        <div style={lab}>Tipo</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {TIPOS.map(t=>(
            <button key={t.id} onClick={()=>setTipo(t.id)}
              style={{border:"1px solid "+(tipo===t.id?t.cor:C.line),background:tipo===t.id?t.cor:C.card,color:tipo===t.id?"#fff":C.muted,
                borderRadius:20,padding:"6px 12px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{t.label}</button>
          ))}
        </div>

        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 160px"}}>
            <div style={lab}>Prioridade</div>
            <div style={{display:"flex",gap:6}}>
              {PRIORIDADES.map(pr=>(
                <button key={pr.id} onClick={()=>setPrio(pr.id)}
                  style={{flex:"1 1 0",border:"1px solid "+(prio===pr.id?pr.cor:C.line),background:prio===pr.id?pr.cor:C.card,color:prio===pr.id?"#fff":C.muted,
                    borderRadius:8,padding:"7px 6px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{pr.label}</button>
              ))}
            </div>
          </div>
          <div style={{flex:"1 1 140px"}}>
            <div style={lab}>Data prevista</div>
            <input type="date" value={planej} onChange={e=>setPlanej(e.target.value)} style={inp}/>
          </div>
        </div>

        <div style={lab}>Título *</div>
        <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="ex.: Vazamento no mancal" style={inp}/>

        <div style={lab}>Descrição</div>
        <textarea value={descr} onChange={e=>setDescr(e.target.value)} rows={3} placeholder="O que está acontecendo…" style={{...inp,resize:"vertical"}}/>

        <div style={{...lab,marginBottom:0}}>Aberta por</div>
        <div style={{fontSize:14,color:C.ink,marginTop:2}}><span aria-hidden>👤</span> <b>{usuario?.nome||"—"}</b>{usuario?.funcao?<span style={{color:C.muted}}> · {usuario.funcao}</span>:null}</div>

        {erro && <div style={{marginTop:12,fontSize:13,color:C.clay,background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:8,padding:"8px 10px"}}>{erro}</div>}

        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={salvar} disabled={salvando}
            style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:salvando?"default":"pointer"}}>{salvando?"abrindo…":"Abrir OS"}</button>
          <button onClick={onFechar} style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalhe da OS: avançar status, concluir (causa raiz/solução/tempo),
// cancelar (motivo) e fotos.
// ---------------------------------------------------------------------------
export function OSDetalhe({ os, equip, setor, usuario, usuarios, componentes, recarregar, onFechar, modoInicial=null }) {
  const [fotos,    setFotos]    = useState([]);
  const [modo,     setModo]     = useState(modoInicial); // null | "concluir" | "cancelar"
  // prefill com o que já houver (preservado ao reabrir uma OS concluída)
  const [causa,    setCausa]    = useState(os.causa_raiz || "");
  const [solucao,  setSolucao]  = useState(os.solucao || "");
  const [tempo,    setTempo]    = useState(os.tempo_parada_min!=null ? String(os.tempo_parada_min) : "");
  const [motivo,   setMotivo]   = useState(os.motivo_cancelamento || "");
  const [fotoTipo, setFotoTipo] = useState("problema");
  const [enviando, setEnviando] = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [erro,     setErro]     = useState("");

  const [historico, setHistorico] = useState([]);
  const carregarFotos = useCallback(async ()=>{ try { setFotos(await listFotos(os.id)); } catch(e){} }, [os.id]);
  const carregarHist  = useCallback(async ()=>{ try { setHistorico(await listHistorico(os.id)); } catch(e){} }, [os.id]);
  useEffect(()=>{ carregarFotos(); carregarHist(); }, [carregarFotos, carregarHist]);

  const registrar = (de, para) => registrarHistorico({ os_id:os.id, de_status:de, para_status:para, usuario_id:usuario?.id||null, usuario_nome:usuario?.nome||null });

  // mover para um status NÃO-terminal (concluir/cancelar têm forma própria)
  const mover = async (para) => {
    if (para === os.status) return;
    if (ehReversao(os.status, para) && !window.confirm(msgReversao(os.status, para))) return;
    setErro("");
    try { await transicionar(os, para, usuario); await recarregar(); await carregarHist(); }
    catch(err){ setErro(String(err.message||err)); }
  };

  const concluir = async () => {
    if (!causa.trim() || !solucao.trim() || tempo==="") { setErro("Causa raiz, solução e tempo de parada são obrigatórios."); return; }
    setErro(""); setBusy(true);
    try { const de=os.status; await fecharOrdem(os.id, { causa_raiz:causa.trim(), solucao:solucao.trim(), tempo_parada_min:parseInt(tempo)||0, executante_id:usuario?.id }); await registrar(de,"concluida"); await recarregar(); onFechar(); }
    catch(err){ setErro(String(err.message||err)); setBusy(false); }
  };
  const cancelar = async () => {
    if (!motivo.trim()) { setErro("Informe o motivo do cancelamento."); return; }
    setErro(""); setBusy(true);
    try { const de=os.status; await cancelarOrdem(os.id, motivo.trim()); await registrar(de,"cancelada"); await recarregar(); onFechar(); }
    catch(err){ setErro(String(err.message||err)); setBusy(false); }
  };

  // linha da timeline: abertura (sintética) + cada mudança registrada
  const linhaAbertura = { para_status:"aberta", usuario_nome: nomeUsuario(os.aberta_por_id, usuarios) || os.solicitante || null, em: os.aberta_em };
  const timeline = [linhaAbertura, ...historico];
  const subirFoto = async (e) => {
    const f = e.target.files && e.target.files[0]; if(!f) return;
    setErro(""); setEnviando(true);
    try { const { url } = await uploadFoto(f, "os"); await addFoto({ os_id:os.id, url, tipo:fotoTipo, legenda:null }); await carregarFotos(); }
    catch(err){ setErro("Falha ao enviar foto: " + (err.message||err)); }
    setEnviando(false); if (e.target) e.target.value = "";
  };
  const tirarFoto = async (id) => { if (window.confirm("Remover esta foto?")) { await removeFoto(id); await carregarFotos(); } };

  const imprimir = () => {
    document.body.classList.add("pcm-printing");
    const limpar = () => { document.body.classList.remove("pcm-printing"); window.removeEventListener("afterprint", limpar); };
    window.addEventListener("afterprint", limpar);
    window.print();
    setTimeout(limpar, 1500);
  };

  const inpD = { border:"1px solid "+C.line, borderRadius:8, padding:"9px 11px", fontSize:14, background:C.paper, color:C.ink, width:"100%" };
  const leadMs = difMs(os.aberta_em, os.concluida_em);   // lead time (abertura → conclusão)
  const execMs = difMs(os.iniciada_em, os.concluida_em); // tempo em execução (início → conclusão)
  const dado = (rot, val) => (
    <div><span style={{color:C.muted,fontSize:11.5}}>{rot}</span><div style={{color:C.ink}}>{val}</div></div>
  );

  return (
    <div onClick={onFechar} style={{position:"fixed",inset:0,background:"rgba(28,42,54,.5)",zIndex:100,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:14,border:"1px solid "+C.line,boxShadow:SH2,width:"100%",maxWidth:520,padding:"20px 22px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontFamily:SERIF,fontSize:19,color:C.brand}}>OS {os.numero||"—"}</span>
          <Pill texto={tipoLabel(os.tipo)} cor={tipoCor(os.tipo)}/>
          <Pill texto={statusLabel(os.status)} cor={statusCor(os.status)}/>
          <Pill texto={"⚑ "+prioLabel(os.prioridade||"media")} cor={prioCor(os.prioridade||"media")}/>
        </div>
        <div style={{fontSize:15,color:C.ink,fontWeight:600,marginTop:10}}>{os.titulo}</div>
        {os.descricao && <div style={{fontSize:13.5,color:C.muted,marginTop:4,whiteSpace:"pre-wrap"}}>{os.descricao}</div>}

        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:14,fontSize:13}}>
          <div><span style={{color:C.muted}}>Equipamento: </span><b style={{color:C.ink}}>{equip?equip.tag+" · "+equip.nome:"—"}</b>{equip && <span style={{marginLeft:6,display:"inline-block",width:16,height:16,borderRadius:4,background:critCor(equip.criticidade),color:"#fff",fontSize:10,fontWeight:700,textAlign:"center",lineHeight:"16px"}}>{equip.criticidade}</span>}</div>
          {os.componente_id && <div><span style={{color:C.muted}}>Componente: </span><b style={{color:C.ink}}>⚙ {nomeComponente(os.componente_id, componentes)||"—"}</b></div>}
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:6,fontSize:12.5,color:C.muted}}>
          <span>Setor: {setor?setor.nome:"—"}</span>
          <span>Aberta por: {nomeUsuario(os.aberta_por_id, usuarios) || os.solicitante || "—"}</span>
          {os.executante_id && <span>Executante: {nomeUsuario(os.executante_id, usuarios) || "—"}</span>}
        </div>

        {/* Datas e tempos */}
        <div style={{marginTop:12,background:C.paper,border:"1px solid "+C.line,borderRadius:10,padding:"10px 12px"}}>
          <div style={{fontSize:11,letterSpacing:.5,textTransform:"uppercase",color:C.muted,fontWeight:700,marginBottom:8}}>Datas e tempos</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"8px 14px",fontSize:13}}>
            {dado("Abertura",      fmtDataHora(os.aberta_em))}
            {dado("Prevista",      fmtDataBR(os.planejada_para))}
            {dado("Início exec.",  fmtDataHora(os.iniciada_em))}
            {dado("Conclusão",     fmtDataHora(os.concluida_em))}
            {dado("Lead time",     fmtDuracao(leadMs))}
            {dado("Em execução",   fmtDuracao(execMs))}
            {dado("Máquina parada", os.tempo_parada_min!=null ? os.tempo_parada_min+" min" : "—")}
          </div>
        </div>

        {/* Resolução (quando terminal) */}
        {os.status==="concluida" && (
          <div style={{marginTop:14,background:C.paper,border:"1px solid "+C.line,borderRadius:10,padding:"10px 12px",fontSize:13}}>
            <div><b style={{color:C.muted,fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>Causa raiz</b><div style={{color:C.ink,whiteSpace:"pre-wrap"}}>{os.causa_raiz}</div></div>
            <div style={{marginTop:6}}><b style={{color:C.muted,fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>Solução</b><div style={{color:C.ink,whiteSpace:"pre-wrap"}}>{os.solucao}</div></div>
            <div style={{marginTop:6,color:C.ink}}>Tempo de máquina parada: <b>{os.tempo_parada_min} min</b></div>
          </div>
        )}
        {os.status==="cancelada" && (
          <div style={{marginTop:14,background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.ink}}>
            <b style={{color:C.clay,fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>Motivo do cancelamento</b>
            <div style={{whiteSpace:"pre-wrap"}}>{os.motivo_cancelamento}</div>
          </div>
        )}

        {/* Fotos */}
        <div style={{borderTop:"1px solid "+C.line,marginTop:16,paddingTop:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:C.muted,fontWeight:600}}>Fotos</span>
            <select value={fotoTipo} onChange={e=>setFotoTipo(e.target.value)} style={{...inpD,width:"auto",padding:"6px 8px",fontSize:12.5}}>
              {FOTO_TIPOS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <label style={{background:C.sage,color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"6px 11px",fontSize:12.5,cursor:"pointer",fontWeight:600}}>
              {enviando?"enviando…":"+ Foto"}
              <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}/>
            </label>
          </div>
          {fotos.length>0 && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
              {fotos.map(f=>(
                <div key={f.id} style={{position:"relative"}}>
                  <a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={fotoLabel(f.tipo)} style={{width:74,height:74,objectFit:"cover",borderRadius:8,border:"1px solid "+C.line,display:"block"}}/></a>
                  <span style={{position:"absolute",left:0,bottom:0,right:0,background:"rgba(28,42,54,.7)",color:"#fff",fontSize:9.5,padding:"1px 4px",borderRadius:"0 0 8px 8px",textAlign:"center"}}>{fotoLabel(f.tipo)}</span>
                  <button onClick={()=>tirarFoto(f.id)} title="Remover" style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:C.clay,color:"#fff",border:"none",fontSize:12,lineHeight:1,cursor:"pointer"}}>&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div style={{borderTop:"1px solid "+C.line,marginTop:16,paddingTop:12}}>
          <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:8}}>Histórico de status</div>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {timeline.map((h,i)=>(
              <div key={h.id||("ab"+i)} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flex:"0 0 auto"}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:statusCor(h.para_status),marginTop:3}}/>
                  {i<timeline.length-1 && <span style={{width:2,flex:1,minHeight:18,background:C.line}}/>}
                </div>
                <div style={{paddingBottom:i<timeline.length-1?10:0}}>
                  <div style={{fontSize:13,color:C.ink}}>
                    {h.de_status ? <><span style={{color:C.muted}}>{statusLabel(h.de_status)} →</span> </> : null}
                    <b style={{color:statusCor(h.para_status)}}>{statusLabel(h.para_status)}</b>
                  </div>
                  <div style={{fontSize:11.5,color:C.muted}}>{fmtDataHora(h.em)}{h.usuario_nome?" · "+h.usuario_nome:""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {erro && <div style={{marginTop:12,fontSize:13,color:C.clay,background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:8,padding:"8px 10px"}}>{erro}</div>}

        {/* Ações */}
        <div style={{borderTop:"1px solid "+C.line,marginTop:14,paddingTop:14}}>
          {modo==="concluir" ? (
            <>
              <div style={{fontSize:13,fontWeight:700,color:C.brand,marginBottom:2}}>Concluir OS</div>
              <div style={lab}>Causa raiz *</div>
              <textarea value={causa} onChange={e=>setCausa(e.target.value)} rows={2} placeholder="Por que aconteceu" style={{...inpD,resize:"vertical"}}/>
              <div style={lab}>Solução aplicada *</div>
              <textarea value={solucao} onChange={e=>setSolucao(e.target.value)} rows={2} placeholder="O que foi feito" style={{...inpD,resize:"vertical"}}/>
              <div style={lab}>Tempo de máquina parada (min) *</div>
              <input type="number" min="0" value={tempo} onChange={e=>setTempo(e.target.value)} style={{...inpD,width:140}}/>
              <div style={{display:"flex",gap:10,marginTop:14}}>
                <button onClick={concluir} disabled={busy} style={{background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:13.5,fontWeight:600,cursor:busy?"default":"pointer"}}>{busy?"concluindo…":"Confirmar conclusão"}</button>
                <button onClick={()=>{ setModo(null); setErro(""); }} style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"9px 14px",fontSize:13,cursor:"pointer"}}>Voltar</button>
              </div>
            </>
          ) : modo==="cancelar" ? (
            <>
              <div style={{fontSize:13,fontWeight:700,color:C.clay,marginBottom:2}}>Cancelar OS</div>
              <div style={lab}>Motivo do cancelamento *</div>
              <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} rows={2} placeholder="Por que está sendo cancelada" style={{...inpD,resize:"vertical"}}/>
              <div style={{display:"flex",gap:10,marginTop:14}}>
                <button onClick={cancelar} disabled={busy} style={{background:C.clay,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:13.5,fontWeight:600,cursor:busy?"default":"pointer"}}>{busy?"cancelando…":"Confirmar cancelamento"}</button>
                <button onClick={()=>{ setModo(null); setErro(""); }} style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"9px 14px",fontSize:13,cursor:"pointer"}}>Voltar</button>
              </div>
            </>
          ) : (
            <>
              <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:8}}>Mover para</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {STATUS.filter(s=>s.id!==os.status).map(s=>{
                  if (s.id==="concluida") return <button key="concluir" onClick={()=>{ setModo("concluir"); setErro(""); }} style={{background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>✓ Concluir</button>;
                  if (s.id==="cancelada") return <button key="cancelar" onClick={()=>{ setModo("cancelar"); setErro(""); }} style={{background:"transparent",color:C.clay,border:"1px solid "+C.clay,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>✕ Cancelar</button>;
                  const rev = ehReversao(os.status, s.id);
                  return <button key={s.id} onClick={()=>mover(s.id)} title={rev?"Reverter status":"Avançar status"}
                    style={{background:rev?"transparent":s.cor,color:rev?s.cor:"#fff",border:rev?"1px solid "+s.cor:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{rev?"↩":"→"} {s.label}</button>;
                })}
              </div>
            </>
          )}
        </div>

        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={imprimir} style={{background:C.sage,color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}><span aria-hidden>🖨</span> Imprimir</button>
          <button onClick={onFechar} style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"9px 16px",fontSize:13,cursor:"pointer"}}>Fechar</button>
        </div>

        {/* Layout de impressão (A4) — escondido na tela, visível só ao imprimir */}
        <div className="pcm-os-print" style={{fontFamily:"Georgia,serif",fontSize:12,lineHeight:1.5}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"2px solid #000",paddingBottom:8,marginBottom:12}}>
            <div>
              <div style={{fontSize:18,fontWeight:700}}>Ordem de Serviço Nº {os.numero||"—"}</div>
              <div style={{fontSize:12}}>Sementes Veneza · PCM — Manutenção</div>
            </div>
            <div style={{textAlign:"right",fontSize:12}}>
              <div>{tipoLabel(os.tipo)} · Prioridade {prioLabel(os.prioridade||"media")}</div>
              <div>Status: <b>{statusLabel(os.status)}</b></div>
            </div>
          </div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{os.titulo}</div>
          {os.descricao && <div style={{marginBottom:10,whiteSpace:"pre-wrap"}}>{os.descricao}</div>}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:12}}>
            <tbody>
              <tr><td style={{padding:"3px 0",width:"50%"}}><b>Equipamento:</b> {equip?equip.tag+" · "+equip.nome:"—"}</td><td style={{padding:"3px 0"}}><b>Setor:</b> {setor?setor.nome:"—"}</td></tr>
              {os.componente_id && <tr><td style={{padding:"3px 0"}} colSpan={2}><b>Componente:</b> {nomeComponente(os.componente_id, componentes)||"—"}</td></tr>}
              <tr><td style={{padding:"3px 0"}}><b>Aberta por:</b> {nomeUsuario(os.aberta_por_id,usuarios)||os.solicitante||"—"}</td><td style={{padding:"3px 0"}}><b>Executante:</b> {nomeUsuario(os.executante_id,usuarios)||"—"}</td></tr>
              <tr><td style={{padding:"3px 0"}}><b>Abertura:</b> {fmtDataHora(os.aberta_em)}</td><td style={{padding:"3px 0"}}><b>Prevista:</b> {fmtDataBR(os.planejada_para)}</td></tr>
              <tr><td style={{padding:"3px 0"}}><b>Início:</b> {fmtDataHora(os.iniciada_em)}</td><td style={{padding:"3px 0"}}><b>Conclusão:</b> {fmtDataHora(os.concluida_em)}</td></tr>
              <tr><td style={{padding:"3px 0"}}><b>Lead time:</b> {fmtDuracao(leadMs)}</td><td style={{padding:"3px 0"}}><b>Em execução:</b> {fmtDuracao(execMs)}</td></tr>
              <tr><td style={{padding:"3px 0"}}><b>Máquina parada:</b> {os.tempo_parada_min!=null?os.tempo_parada_min+" min":"—"}</td><td style={{padding:"3px 0"}}></td></tr>
            </tbody>
          </table>
          {os.status==="concluida" && (
            <div style={{borderTop:"1px solid #000",paddingTop:8}}>
              <div><b>Causa raiz:</b> {os.causa_raiz}</div>
              <div><b>Solução aplicada:</b> {os.solucao}</div>
            </div>
          )}
          {os.status==="cancelada" && <div style={{borderTop:"1px solid #000",paddingTop:8}}><b>Motivo do cancelamento:</b> {os.motivo_cancelamento}</div>}
          <div style={{marginTop:28,display:"flex",justifyContent:"space-between"}}>
            <div style={{borderTop:"1px solid #000",paddingTop:4,width:"42%",textAlign:"center",fontSize:11}}>Executante</div>
            <div style={{borderTop:"1px solid #000",paddingTop:4,width:"42%",textAlign:"center",fontSize:11}}>Supervisor</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drag-and-drop (coluna soltável + cartão arrastável)
// ---------------------------------------------------------------------------
function ColunaSoltavel({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{flex:"0 0 232px",minWidth:232,background:isOver?C.sage:C.paper,border:"1px solid "+(isOver?C.brand2:C.line),borderRadius:12,padding:"8px 8px 10px",transition:"background .12s,border-color .12s"}}>
      {children}
    </div>
  );
}
function CartaoArrastavel({ id, onClick, children }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={onClick}
      style={{opacity:isDragging?0.35:1,touchAction:"none",cursor:"grab"}}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ordens (exportado) — board Kanban com drag-and-drop
// ---------------------------------------------------------------------------
export function Ordens({ setores, equipamentos, componentes, ordens, usuario, usuarios, recarregar }) {
  const [form,  setForm]  = useState(false);
  const [selId, setSelId] = useState(null);

  const equipMap = {}; equipamentos.forEach(e=>{ equipMap[e.id]=e; });
  const setorMap = {}; setores.forEach(s=>{ setorMap[s.id]=s; });
  const sel = ordens.find(o=>o.id===selId) || null;
  const selEquip = sel ? equipMap[sel.equipamento_id] : null;

  const [modoDetalhe, setModoDetalhe] = useState(null);
  const [arrastando,  setArrastando]  = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const CardVisual = (o) => {
    const e = equipMap[o.equipamento_id];
    return (
      <div style={{background:C.card,border:"1px solid "+C.line,borderLeft:"3px solid "+tipoCor(o.tipo),borderRadius:9,padding:"9px 10px",boxShadow:SH}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
          <span style={{fontFamily:SERIF,fontSize:12.5,color:C.brand,fontWeight:700}}>{o.numero||"—"}</span>
          <span style={{display:"flex",gap:4,alignItems:"center"}}>
            {o.prioridade==="alta" && <Pill texto="⚑ Alta" cor={prioCor("alta")}/>}
            <Pill texto={tipoLabel(o.tipo)} cor={tipoCor(o.tipo)}/>
          </span>
        </div>
        <div style={{fontSize:13.5,color:C.ink,marginTop:5,lineHeight:1.25}}>{o.titulo}</div>
        {o.componente_id && <div style={{fontSize:11.5,color:C.brand2,marginTop:2}}>⚙ {nomeComponente(o.componente_id, componentes)}</div>}
        <div style={{fontSize:11.5,color:C.muted,marginTop:5,display:"flex",alignItems:"center",gap:5}}>
          {e && <span style={{width:14,height:14,borderRadius:4,background:critCor(e.criticidade),color:"#fff",fontSize:9,fontWeight:700,textAlign:"center",lineHeight:"14px",flex:"0 0 auto"}}>{e.criticidade}</span>}
          <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e?e.tag:"—"}</span>
          <span style={{marginLeft:"auto",flex:"0 0 auto"}}>{dataCurta(o.aberta_em)}</span>
        </div>
      </div>
    );
  };

  const handleDragEnd = async ({ active, over }) => {
    setArrastando(null);
    if (!over) return;
    const os = ordens.find(o=>o.id===active.id); const para = over.id;
    if (!os || os.status===para) return;
    if (para==="concluida") { setModoDetalhe("concluir"); setSelId(os.id); return; } // soltar em Concluída abre o fechamento
    if (para==="cancelada") { setModoDetalhe("cancelar"); setSelId(os.id); return; }
    if (ehReversao(os.status, para) && !window.confirm(msgReversao(os.status, para))) return;
    try { await transicionar(os, para, usuario); await recarregar(); } catch(e){}
  };

  const semEquip = equipamentos.length===0;
  const arrastandoOS = arrastando ? ordens.find(o=>o.id===arrastando) : null;

  return (<>
    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:14}}>
      <button onClick={()=>!semEquip && setForm(true)} disabled={semEquip}
        style={{background:semEquip?C.line:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:semEquip?"default":"pointer",whiteSpace:"nowrap"}}>
        + Abrir OS
      </button>
      {semEquip && <span style={{fontSize:13,color:C.muted}}>Cadastre um equipamento primeiro (aba Equipamentos).</span>}
      <span style={{marginLeft:"auto",fontSize:12.5,color:C.muted}}>{ordens.length} OS · arraste os cards entre as colunas</span>
    </div>

    <DndContext sensors={sensors} onDragStart={({active})=>setArrastando(active.id)} onDragCancel={()=>setArrastando(null)} onDragEnd={handleDragEnd}>
      <div style={{display:"flex",gap:12,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:8,marginTop:16}}>
        {STATUS.map(col=>{
          const itens = ordens.filter(o=>o.status===col.id);
          return (
            <ColunaSoltavel key={col.id} id={col.id}>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 4px 8px"}}>
                <span style={{width:9,height:9,borderRadius:"50%",background:col.cor,flex:"0 0 auto"}}/>
                <span style={{fontSize:12.5,fontWeight:700,color:C.ink}}>{col.label}</span>
                <span style={{marginLeft:"auto",fontSize:11.5,color:C.muted,background:C.card,border:"1px solid "+C.line,borderRadius:20,padding:"0 7px"}}>{itens.length}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,minHeight:30}}>
                {itens.map(o=>(
                  <CartaoArrastavel key={o.id} id={o.id} onClick={()=>setSelId(o.id)}>{CardVisual(o)}</CartaoArrastavel>
                ))}
                {itens.length===0 && <div style={{fontSize:11.5,color:C.muted,textAlign:"center",padding:"10px 0"}}>—</div>}
              </div>
            </ColunaSoltavel>
          );
        })}
      </div>
      <DragOverlay>{arrastandoOS ? <div style={{cursor:"grabbing"}}>{CardVisual(arrastandoOS)}</div> : null}</DragOverlay>
    </DndContext>

    {form && <FormOS setores={setores} equipamentos={equipamentos} componentes={componentes} usuario={usuario} onFechar={()=>setForm(false)} onSalvo={recarregar}/>}
    {sel && <OSDetalhe key={sel.id} os={sel} equip={selEquip} setor={selEquip?setorMap[selEquip.setor_id]:null} usuario={usuario} usuarios={usuarios} componentes={componentes} recarregar={recarregar} modoInicial={modoDetalhe} onFechar={()=>{ setSelId(null); setModoDetalhe(null); }}/>}
  </>);
}
