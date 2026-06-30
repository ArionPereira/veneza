import React from "react";
const { useState, useEffect, useCallback } = React;
import { C, SH, SH2, SERIF } from "../../constants.js";
import { STATUS, FLUXO, TIPOS, FOTO_TIPOS, statusLabel, statusCor, tipoLabel, tipoCor, critCor } from "./pcmconst.js";
import { addOrdem, mudarStatus, fecharOrdem, cancelarOrdem, listFotos, addFoto, removeFoto, uploadFoto } from "./pcmdb.js";

const fotoLabel = (id) => (FOTO_TIPOS.find(t=>t.id===id)||{}).label || id;
// nome do usuário pela FK, caindo no texto legado (solicitante) p/ OS antigas
const nomeUsuario = (id, usuarios) => { const u=(usuarios||[]).find(x=>x.id===id); return u?u.nome:null; };

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
export function FormOS({ setores, equipamentos, usuario, equipPre, onFechar, onSalvo }) {
  const [equipId, setEquipId] = useState(equipPre || "");
  const [tipo,    setTipo]    = useState("corretiva");
  const [titulo,  setTitulo]  = useState("");
  const [descr,   setDescr]   = useState("");
  const [salvando,setSalvando]= useState(false);
  const [erro,    setErro]    = useState("");

  const grupos = setores.map(s=>({ s, itens:equipamentos.filter(e=>e.setor_id===s.id) })).filter(g=>g.itens.length);
  const semSetor = equipamentos.filter(e=>!e.setor_id || !setores.some(s=>s.id===e.setor_id));

  const salvar = async () => {
    if (!equipId)       { setErro("Escolha o equipamento."); return; }
    if (!titulo.trim()) { setErro("Informe um título."); return; }
    setErro(""); setSalvando(true);
    try {
      await addOrdem({ equipamento_id:equipId, tipo, titulo:titulo.trim(), descricao:descr.trim()||null, status:"aberta", aberta_por_id:usuario?.id||null });
      await onSalvo(); onFechar();
    } catch(err){ setErro(String(err.message||err)); setSalvando(false); }
  };

  return (
    <div onClick={onFechar} style={{position:"fixed",inset:0,background:"rgba(28,42,54,.5)",zIndex:100,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:14,border:"1px solid "+C.line,boxShadow:SH2,width:"100%",maxWidth:480,padding:"20px 22px"}}>
        <div style={{fontFamily:SERIF,fontSize:18,color:C.brand,marginBottom:4}}>Abrir ordem de serviço</div>

        <div style={lab}>Equipamento *</div>
        <select value={equipId} onChange={e=>setEquipId(e.target.value)} style={inp}>
          <option value="">— escolha —</option>
          {grupos.map(g=>(
            <optgroup key={g.s.id} label={g.s.nome}>
              {g.itens.map(e=><option key={e.id} value={e.id}>{e.tag} · {e.nome}</option>)}
            </optgroup>
          ))}
          {semSetor.length>0 && <optgroup label="Sem setor">{semSetor.map(e=><option key={e.id} value={e.id}>{e.tag} · {e.nome}</option>)}</optgroup>}
        </select>

        <div style={lab}>Tipo</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {TIPOS.map(t=>(
            <button key={t.id} onClick={()=>setTipo(t.id)}
              style={{border:"1px solid "+(tipo===t.id?t.cor:C.line),background:tipo===t.id?t.cor:C.card,color:tipo===t.id?"#fff":C.muted,
                borderRadius:20,padding:"6px 12px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{t.label}</button>
          ))}
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
export function OSDetalhe({ os, equip, setor, usuario, usuarios, recarregar, onFechar }) {
  const [fotos,    setFotos]    = useState([]);
  const [modo,     setModo]     = useState(null); // null | "concluir" | "cancelar"
  const [causa,    setCausa]    = useState("");
  const [solucao,  setSolucao]  = useState("");
  const [tempo,    setTempo]    = useState("");
  const [motivo,   setMotivo]   = useState("");
  const [fotoTipo, setFotoTipo] = useState("problema");
  const [enviando, setEnviando] = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [erro,     setErro]     = useState("");

  const carregarFotos = useCallback(async ()=>{ try { setFotos(await listFotos(os.id)); } catch(e){} }, [os.id]);
  useEffect(()=>{ carregarFotos(); }, [carregarFotos]);

  const terminal    = ehTerminal(os.status);
  const proximos    = (FLUXO[os.status]||[]).filter(s=>!ehTerminal(s));
  const podeConcluir= (FLUXO[os.status]||[]).includes("concluida");
  const podeCancelar= (FLUXO[os.status]||[]).includes("cancelada");

  const avancar = async (novo) => { setErro(""); try { await mudarStatus(os.id, novo); await recarregar(); } catch(err){ setErro(String(err.message||err)); } };

  const concluir = async () => {
    if (!causa.trim() || !solucao.trim() || tempo==="") { setErro("Causa raiz, solução e tempo de parada são obrigatórios."); return; }
    setErro(""); setBusy(true);
    try { await fecharOrdem(os.id, { causa_raiz:causa.trim(), solucao:solucao.trim(), tempo_parada_min:parseInt(tempo)||0, executante_id:usuario?.id }); await recarregar(); onFechar(); }
    catch(err){ setErro(String(err.message||err)); setBusy(false); }
  };
  const cancelar = async () => {
    if (!motivo.trim()) { setErro("Informe o motivo do cancelamento."); return; }
    setErro(""); setBusy(true);
    try { await cancelarOrdem(os.id, motivo.trim()); await recarregar(); onFechar(); }
    catch(err){ setErro(String(err.message||err)); setBusy(false); }
  };
  const subirFoto = async (e) => {
    const f = e.target.files && e.target.files[0]; if(!f) return;
    setErro(""); setEnviando(true);
    try { const { url } = await uploadFoto(f, "os"); await addFoto({ os_id:os.id, url, tipo:fotoTipo, legenda:null }); await carregarFotos(); }
    catch(err){ setErro("Falha ao enviar foto: " + (err.message||err)); }
    setEnviando(false); if (e.target) e.target.value = "";
  };
  const tirarFoto = async (id) => { if (window.confirm("Remover esta foto?")) { await removeFoto(id); await carregarFotos(); } };

  const inpD = { border:"1px solid "+C.line, borderRadius:8, padding:"9px 11px", fontSize:14, background:C.paper, color:C.ink, width:"100%" };

  return (
    <div onClick={onFechar} style={{position:"fixed",inset:0,background:"rgba(28,42,54,.5)",zIndex:100,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:14,border:"1px solid "+C.line,boxShadow:SH2,width:"100%",maxWidth:520,padding:"20px 22px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontFamily:SERIF,fontSize:19,color:C.brand}}>OS {os.numero||"—"}</span>
          <Pill texto={tipoLabel(os.tipo)} cor={tipoCor(os.tipo)}/>
          <Pill texto={statusLabel(os.status)} cor={statusCor(os.status)}/>
        </div>
        <div style={{fontSize:15,color:C.ink,fontWeight:600,marginTop:10}}>{os.titulo}</div>
        {os.descricao && <div style={{fontSize:13.5,color:C.muted,marginTop:4,whiteSpace:"pre-wrap"}}>{os.descricao}</div>}

        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:14,fontSize:13}}>
          <div><span style={{color:C.muted}}>Equipamento: </span><b style={{color:C.ink}}>{equip?equip.tag+" · "+equip.nome:"—"}</b>{equip && <span style={{marginLeft:6,display:"inline-block",width:16,height:16,borderRadius:4,background:critCor(equip.criticidade),color:"#fff",fontSize:10,fontWeight:700,textAlign:"center",lineHeight:"16px"}}>{equip.criticidade}</span>}</div>
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:6,fontSize:12.5,color:C.muted}}>
          <span>Setor: {setor?setor.nome:"—"}</span>
          <span>Aberta por: {nomeUsuario(os.aberta_por_id, usuarios) || os.solicitante || "—"}</span>
          {os.executante_id && <span>Executante: {nomeUsuario(os.executante_id, usuarios) || "—"}</span>}
          <span>Aberta: {dataCurta(os.aberta_em)}</span>
          {os.concluida_em && <span>Concluída: {dataCurta(os.concluida_em)}</span>}
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

        {erro && <div style={{marginTop:12,fontSize:13,color:C.clay,background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:8,padding:"8px 10px"}}>{erro}</div>}

        {/* Ações */}
        {!terminal && (
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
                <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:8}}>Avançar status</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {proximos.map(s=>(
                    <button key={s} onClick={()=>avancar(s)} style={{background:statusCor(s),color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>→ {statusLabel(s)}</button>
                  ))}
                  {podeConcluir && <button onClick={()=>{ setModo("concluir"); setErro(""); }} style={{background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>✓ Concluir OS</button>}
                  {podeCancelar && <button onClick={()=>{ setModo("cancelar"); setErro(""); }} style={{background:"transparent",color:C.clay,border:"1px solid "+C.clay,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar OS</button>}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{marginTop:16}}>
          <button onClick={onFechar} style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"9px 16px",fontSize:13,cursor:"pointer"}}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ordens (exportado) — board Kanban
// ---------------------------------------------------------------------------
export function Ordens({ setores, equipamentos, ordens, usuario, usuarios, recarregar }) {
  const [form,  setForm]  = useState(false);
  const [selId, setSelId] = useState(null);

  const equipMap = {}; equipamentos.forEach(e=>{ equipMap[e.id]=e; });
  const setorMap = {}; setores.forEach(s=>{ setorMap[s.id]=s; });
  const sel = ordens.find(o=>o.id===selId) || null;
  const selEquip = sel ? equipMap[sel.equipamento_id] : null;

  const Card = (o) => {
    const e = equipMap[o.equipamento_id];
    return (
      <button key={o.id} onClick={()=>setSelId(o.id)}
        style={{display:"block",width:"100%",textAlign:"left",background:C.card,border:"1px solid "+C.line,borderLeft:"3px solid "+tipoCor(o.tipo),borderRadius:9,padding:"9px 10px",cursor:"pointer",boxShadow:SH}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
          <span style={{fontFamily:SERIF,fontSize:12.5,color:C.brand,fontWeight:700}}>{o.numero||"—"}</span>
          <Pill texto={tipoLabel(o.tipo)} cor={tipoCor(o.tipo)}/>
        </div>
        <div style={{fontSize:13.5,color:C.ink,marginTop:5,lineHeight:1.25}}>{o.titulo}</div>
        <div style={{fontSize:11.5,color:C.muted,marginTop:5,display:"flex",alignItems:"center",gap:5}}>
          {e && <span style={{width:14,height:14,borderRadius:4,background:critCor(e.criticidade),color:"#fff",fontSize:9,fontWeight:700,textAlign:"center",lineHeight:"14px",flex:"0 0 auto"}}>{e.criticidade}</span>}
          <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e?e.tag:"—"}</span>
          <span style={{marginLeft:"auto",flex:"0 0 auto"}}>{dataCurta(o.aberta_em)}</span>
        </div>
      </button>
    );
  };

  const semEquip = equipamentos.length===0;

  return (<>
    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:14}}>
      <button onClick={()=>!semEquip && setForm(true)} disabled={semEquip}
        style={{background:semEquip?C.line:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:semEquip?"default":"pointer",whiteSpace:"nowrap"}}>
        + Abrir OS
      </button>
      {semEquip && <span style={{fontSize:13,color:C.muted}}>Cadastre um equipamento primeiro (aba Equipamentos).</span>}
      <span style={{marginLeft:"auto",fontSize:12.5,color:C.muted}}>{ordens.length} OS no total</span>
    </div>

    <div style={{display:"flex",gap:12,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:8,marginTop:16}}>
      {STATUS.map(col=>{
        const itens = ordens.filter(o=>o.status===col.id);
        return (
          <div key={col.id} style={{flex:"0 0 232px",minWidth:232,background:C.paper,border:"1px solid "+C.line,borderRadius:12,padding:"8px 8px 10px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 4px 8px"}}>
              <span style={{width:9,height:9,borderRadius:"50%",background:col.cor,flex:"0 0 auto"}}/>
              <span style={{fontSize:12.5,fontWeight:700,color:C.ink}}>{col.label}</span>
              <span style={{marginLeft:"auto",fontSize:11.5,color:C.muted,background:C.card,border:"1px solid "+C.line,borderRadius:20,padding:"0 7px"}}>{itens.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {itens.map(Card)}
              {itens.length===0 && <div style={{fontSize:11.5,color:C.muted,textAlign:"center",padding:"10px 0"}}>—</div>}
            </div>
          </div>
        );
      })}
    </div>

    {form && <FormOS setores={setores} equipamentos={equipamentos} usuario={usuario} onFechar={()=>setForm(false)} onSalvo={recarregar}/>}
    {sel && <OSDetalhe os={sel} equip={selEquip} setor={selEquip?setorMap[selEquip.setor_id]:null} usuario={usuario} usuarios={usuarios} recarregar={recarregar} onFechar={()=>setSelId(null)}/>}
  </>);
}
