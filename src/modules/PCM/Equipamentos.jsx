import React from "react";
const { useState } = React;
import { C, SH, SH2, SERIF } from "../../constants.js";
import { CRITICIDADE, critCor, critLabel, statusLabel, statusCor, tipoLabel, tipoCor } from "./pcmconst.js";
import {
  addEquipamento, updateEquipamento, removeEquipamento,
  addSetor, updateSetor, removeSetor, uploadFoto,
} from "./pcmdb.js";
import { FormOS, OSDetalhe } from "./Ordens.jsx";

const dataCurta = (iso) => { try { return new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}); } catch(e){ return ""; } };
function Pill({ texto, cor }) {
  return <span style={{display:"inline-block",fontSize:10,fontWeight:700,color:"#fff",background:cor,borderRadius:20,padding:"2px 7px",whiteSpace:"nowrap"}}>{texto}</span>;
}

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"9px 11px", fontSize:14, background:C.paper, color:C.ink, width:"100%" };
const lab = { fontSize:12, color:C.muted, fontWeight:600, margin:"10px 0 4px" };
const norm = (s) => (s||"").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();

function CritChip({ id, pequeno }) {
  return (
    <span title={critLabel(id)} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:pequeno?20:24,height:pequeno?20:24,borderRadius:6,background:critCor(id),color:"#fff",
      fontWeight:700,fontSize:pequeno?12:13,flex:"0 0 auto"}}>{id}</span>
  );
}

// ---------------------------------------------------------------------------
// Formulário (novo / editar) em modal
// ---------------------------------------------------------------------------
function FormEquip({ setores, equip, onFechar, onSalvo }) {
  const [setorId,    setSetorId]    = useState(equip?.setor_id || (setores[0]?.id || ""));
  const [tag,        setTag]        = useState(equip?.tag || "");
  const [nome,       setNome]       = useState(equip?.nome || "");
  const [fabricante, setFabricante] = useState(equip?.fabricante || "");
  const [modelo,     setModelo]     = useState(equip?.modelo || "");
  const [crit,       setCrit]       = useState(equip?.criticidade || "C");
  const [fotoUrl,    setFotoUrl]    = useState(equip?.foto_url || "");
  const [enviando,   setEnviando]   = useState(false);
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState("");

  const subirFoto = async (e) => {
    const f = e.target.files && e.target.files[0]; if(!f) return;
    setErro(""); setEnviando(true);
    try { const { url } = await uploadFoto(f, "equip"); setFotoUrl(url); }
    catch(err){ setErro("Falha ao enviar foto: " + (err.message||err)); }
    setEnviando(false);
    if (e.target) e.target.value = "";
  };

  const salvar = async () => {
    if (!tag.trim() || !nome.trim()) { setErro("TAG e nome são obrigatórios."); return; }
    setErro(""); setSalvando(true);
    const dados = { setor_id:setorId||null, tag:tag.trim(), nome:nome.trim(),
      fabricante:fabricante.trim()||null, modelo:modelo.trim()||null, criticidade:crit, foto_url:fotoUrl||null };
    try {
      if (equip) await updateEquipamento(equip.id, dados);
      else       await addEquipamento(dados);
      await onSalvo();
      onFechar();
    } catch(err) {
      const msg = String(err.message||err);
      setErro(/duplicate|unique|already exists|pcm_equipamentos_tag/i.test(msg) ? "Já existe um equipamento com essa TAG." : msg);
      setSalvando(false);
    }
  };

  return (
    <div onClick={onFechar} style={{position:"fixed",inset:0,background:"rgba(28,42,54,.5)",zIndex:100,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:14,border:"1px solid "+C.line,boxShadow:SH2,width:"100%",maxWidth:480,padding:"20px 22px"}}>
        <div style={{fontFamily:SERIF,fontSize:18,color:C.brand,marginBottom:4}}>{equip?"Editar equipamento":"Novo equipamento"}</div>

        <div style={lab}>Setor</div>
        <select value={setorId} onChange={e=>setSetorId(e.target.value)} style={inp}>
          <option value="">— sem setor —</option>
          {setores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <div style={{display:"flex",gap:10}}>
          <div style={{flex:"1 1 0"}}>
            <div style={lab}>TAG *</div>
            <input value={tag} onChange={e=>setTag(e.target.value)} placeholder="ex.: SEC-01" style={inp}/>
          </div>
          <div style={{flex:"2 1 0"}}>
            <div style={lab}>Nome *</div>
            <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="ex.: Secador rotativo 1" style={inp}/>
          </div>
        </div>

        <div style={{display:"flex",gap:10}}>
          <div style={{flex:"1 1 0"}}>
            <div style={lab}>Fabricante</div>
            <input value={fabricante} onChange={e=>setFabricante(e.target.value)} style={inp}/>
          </div>
          <div style={{flex:"1 1 0"}}>
            <div style={lab}>Modelo</div>
            <input value={modelo} onChange={e=>setModelo(e.target.value)} style={inp}/>
          </div>
        </div>

        <div style={lab}>Criticidade</div>
        <div style={{display:"flex",gap:8}}>
          {CRITICIDADE.map(c=>(
            <button key={c.id} onClick={()=>setCrit(c.id)}
              style={{flex:"1 1 0",border:"1px solid "+(crit===c.id?c.cor:C.line),background:crit===c.id?c.cor:C.card,
                color:crit===c.id?"#fff":C.muted,borderRadius:8,padding:"8px 6px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>
              {c.label}
            </button>
          ))}
        </div>

        <div style={lab}>Foto</div>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          {fotoUrl
            ? <img src={fotoUrl} alt="" style={{width:84,height:84,objectFit:"cover",borderRadius:10,border:"1px solid "+C.line}}/>
            : <div style={{width:84,height:84,borderRadius:10,border:"1px dashed "+C.line,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:11,textAlign:"center"}}>sem foto</div>}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{background:C.sage,color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"7px 12px",fontSize:13,cursor:"pointer",fontWeight:600}}>
              {enviando?"enviando…":(fotoUrl?"Trocar foto":"Enviar foto")}
              <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}/>
            </label>
            {fotoUrl && <button onClick={()=>setFotoUrl("")} style={{background:"transparent",border:"none",color:C.clay,fontSize:12,cursor:"pointer",textAlign:"left"}}>remover foto</button>}
          </div>
        </div>

        {erro && <div style={{marginTop:12,fontSize:13,color:C.clay,background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:8,padding:"8px 10px"}}>{erro}</div>}

        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={salvar} disabled={salvando||enviando}
            style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:(salvando||enviando)?"default":"pointer"}}>
            {salvando?"salvando…":"Salvar"}
          </button>
          <button onClick={onFechar} style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"10px 16px",fontSize:14,cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel de setores
// ---------------------------------------------------------------------------
function PainelSetores({ setores, equipamentos, recarregar }) {
  const [novo, setNovo] = useState("");
  const cont = (sid) => equipamentos.filter(e=>e.setor_id===sid).length;

  const renomear = async (s, nome) => { if(nome.trim() && nome.trim()!==s.nome){ await updateSetor(s.id,{nome:nome.trim()}); await recarregar(); } };
  const adicionar = async () => { if(!novo.trim()) return; await addSetor(novo.trim(), setores.length+1); setNovo(""); await recarregar(); };
  const remover = async (s) => { const n=cont(s.id); if(window.confirm(n>0?("Remover \""+s.nome+"\"? Os "+n+" equipamento(s) ficam sem setor."):("Remover \""+s.nome+"\"?"))){ await removeSetor(s.id); await recarregar(); } };

  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,boxShadow:SH,padding:"14px 16px",marginTop:12}}>
      <div style={{fontSize:13,fontWeight:700,color:C.brand,marginBottom:10}}>Setores</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {setores.map(s=>(
          <div key={s.id} style={{display:"flex",gap:8,alignItems:"center"}}>
            <input defaultValue={s.nome} onBlur={e=>renomear(s,e.target.value)} style={{...inp,flex:"1 1 auto"}}/>
            <span style={{fontSize:12,color:C.muted,width:74,textAlign:"right"}}>{cont(s.id)} equip.</span>
            <button onClick={()=>remover(s)} style={{border:"none",background:"transparent",color:C.clay,cursor:"pointer",fontSize:18}}>&times;</button>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <input value={novo} onChange={e=>setNovo(e.target.value)} placeholder="Novo setor…" onKeyDown={e=>{ if(e.key==="Enter") adicionar(); }} style={{...inp,flex:"1 1 auto"}}/>
        <button onClick={adicionar} style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Setor</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ficha do equipamento
// ---------------------------------------------------------------------------
function Ficha({ equip, setores, equipamentos, ordens, recarregar, nome, onVoltar, onEditar, onRemovido }) {
  const [osSel, setOsSel] = useState(null);
  const [abrir, setAbrir] = useState(false);
  const setor = setores.find(s=>s.id===equip.setor_id);
  const osDoEquip = ordens.filter(o=>o.equipamento_id===equip.id);
  const osAberta = osDoEquip.find(o=>o.id===osSel) || null;
  const dado = (rot, val) => (
    <div style={{flex:"1 1 150px"}}>
      <div style={{fontSize:10.5,letterSpacing:.5,textTransform:"uppercase",color:C.muted,fontWeight:600}}>{rot}</div>
      <div style={{fontSize:14.5,color:C.ink,marginTop:2}}>{val||"—"}</div>
    </div>
  );
  const remover = async () => { if(window.confirm("Remover o equipamento \""+equip.tag+" · "+equip.nome+"\"? As OS dele também serão apagadas.")){ await removeEquipamento(equip.id); await onRemovido(); } };

  return (
    <div style={{marginTop:12}}>
      <button onClick={onVoltar} style={{background:"transparent",border:"none",color:C.brand,fontSize:14,fontWeight:600,cursor:"pointer",padding:0,marginBottom:12}}>← Equipamentos</button>
      <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:14,boxShadow:SH,overflow:"hidden"}}>
        <div style={{display:"flex",gap:16,padding:"18px 18px",flexWrap:"wrap",alignItems:"flex-start"}}>
          {equip.foto_url
            ? <img src={equip.foto_url} alt="" style={{width:120,height:120,objectFit:"cover",borderRadius:12,border:"1px solid "+C.line,flex:"0 0 auto"}}/>
            : <div style={{width:120,height:120,borderRadius:12,border:"1px dashed "+C.line,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:12,flex:"0 0 auto"}}>sem foto</div>}
          <div style={{flex:"1 1 240px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <CritChip id={equip.criticidade}/>
              <span style={{fontFamily:SERIF,fontSize:20,color:C.brand}}>{equip.nome}</span>
            </div>
            <div style={{fontSize:13,color:C.muted,marginTop:3}}>TAG <b style={{color:C.ink}}>{equip.tag}</b> · {setor?setor.nome:"sem setor"}</div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:14}}>
              {dado("Fabricante", equip.fabricante)}
              {dado("Modelo", equip.modelo)}
              {dado("Criticidade", critLabel(equip.criticidade))}
              {dado("Setor", setor?setor.nome:"—")}
            </div>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={onEditar} style={{background:C.sage,color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Editar</button>
              <button onClick={remover} style={{background:"transparent",color:C.clay,border:"1px solid "+C.clay,borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer"}}>Remover</button>
            </div>
          </div>
        </div>
        <div style={{borderTop:"1px solid "+C.line,padding:"14px 18px",background:C.paper}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:10}}>
            <div style={{fontSize:12,letterSpacing:.5,textTransform:"uppercase",color:C.muted,fontWeight:700}}>Histórico de OS <span style={{color:C.line}}>·</span> {osDoEquip.length}</div>
            <button onClick={()=>setAbrir(true)} style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"7px 13px",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Abrir OS</button>
          </div>
          {osDoEquip.length===0
            ? <div style={{fontSize:13,color:C.muted}}>Nenhuma OS para este equipamento ainda.</div>
            : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {osDoEquip.map(o=>(
                  <button key={o.id} onClick={()=>setOsSel(o.id)}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",background:C.card,border:"1px solid "+C.line,borderRadius:9,padding:"9px 11px",cursor:"pointer"}}>
                    <span style={{fontFamily:SERIF,fontSize:12.5,color:C.brand,fontWeight:700,flex:"0 0 auto"}}>{o.numero||"—"}</span>
                    <Pill texto={tipoLabel(o.tipo)} cor={tipoCor(o.tipo)}/>
                    <span style={{flex:"1 1 auto",fontSize:13.5,color:C.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{o.titulo}</span>
                    <Pill texto={statusLabel(o.status)} cor={statusCor(o.status)}/>
                    <span style={{flex:"0 0 auto",fontSize:11.5,color:C.muted}}>{dataCurta(o.concluida_em||o.aberta_em)}</span>
                  </button>
                ))}
              </div>}
        </div>
      </div>

      {abrir && <FormOS setores={setores} equipamentos={equipamentos} nome={nome} equipPre={equip.id} onFechar={()=>setAbrir(false)} onSalvo={recarregar}/>}
      {osAberta && <OSDetalhe os={osAberta} equip={equip} setor={setor} recarregar={recarregar} onFechar={()=>setOsSel(null)}/>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Equipamentos (exportado)
// ---------------------------------------------------------------------------
export function Equipamentos({ setores, equipamentos, ordens, recarregar, nome }) {
  const [busca,    setBusca]    = useState("");
  const [sel,      setSel]      = useState(null);   // id do equipamento na ficha
  const [form,     setForm]     = useState(null);   // null | {equip} | {equip:undefined} (novo)
  const [verSet,   setVerSet]   = useState(false);

  const selecionado = equipamentos.find(e=>e.id===sel);
  if (sel && selecionado) {
    return (<>
      <Ficha equip={selecionado} setores={setores} equipamentos={equipamentos} ordens={ordens} recarregar={recarregar} nome={nome}
        onVoltar={()=>setSel(null)} onEditar={()=>setForm({ equip:selecionado })}
        onRemovido={async ()=>{ setSel(null); await recarregar(); }}/>
      {form && <FormEquip setores={setores} equip={form.equip} onFechar={()=>setForm(null)} onSalvo={recarregar}/>}
    </>);
  }

  const q = norm(busca);
  const filtra = (e) => !q || norm(e.tag).includes(q) || norm(e.nome).includes(q) || norm(e.fabricante).includes(q);
  const lista = equipamentos.filter(filtra);
  const porSetor = setores.map(s=>({ setor:s, itens:lista.filter(e=>e.setor_id===s.id) }));
  const semSetor = lista.filter(e=>!e.setor_id || !setores.some(s=>s.id===e.setor_id));

  const Linha = (e) => (
    <button key={e.id} onClick={()=>setSel(e.id)}
      style={{display:"flex",alignItems:"center",gap:12,width:"100%",textAlign:"left",background:C.card,border:"1px solid "+C.line,borderRadius:10,padding:"10px 12px",cursor:"pointer"}}>
      <CritChip id={e.criticidade} pequeno/>
      {e.foto_url
        ? <img src={e.foto_url} alt="" style={{width:38,height:38,objectFit:"cover",borderRadius:8,flex:"0 0 auto"}}/>
        : <div style={{width:38,height:38,borderRadius:8,background:C.sage,flex:"0 0 auto"}}/>}
      <span style={{flex:"0 0 auto",fontFamily:SERIF,fontSize:13,color:C.brand,fontWeight:700,minWidth:60}}>{e.tag}</span>
      <span style={{flex:"1 1 auto",fontSize:14,color:C.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.nome}</span>
      <span style={{flex:"0 0 auto",fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{[e.fabricante,e.modelo].filter(Boolean).join(" · ")}</span>
    </button>
  );

  return (<>
    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:14}}>
      <button onClick={()=>setForm({ equip:undefined })}
        style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
        + Novo equipamento
      </button>
      <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por TAG, nome ou fabricante…" style={{...inp,flex:"1 1 220px",maxWidth:340}}/>
      <button onClick={()=>setVerSet(v=>!v)}
        style={{background:verSet?C.sage:"transparent",color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
        {verSet?"▾":"▸"} Setores
      </button>
    </div>

    {verSet && <PainelSetores setores={setores} equipamentos={equipamentos} recarregar={recarregar}/>}

    {equipamentos.length===0 && <p style={{fontSize:14,color:C.muted,marginTop:16}}>Nenhum equipamento ainda. Clique em <b>+ Novo equipamento</b> para começar.</p>}

    <div style={{display:"flex",flexDirection:"column",gap:18,marginTop:16}}>
      {porSetor.filter(g=>g.itens.length).map(g=>(
        <div key={g.setor.id}>
          <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase",color:C.muted,fontWeight:700,marginBottom:8}}>{g.setor.nome} <span style={{color:C.line}}>·</span> {g.itens.length}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{g.itens.map(Linha)}</div>
        </div>
      ))}
      {semSetor.length>0 && (
        <div>
          <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase",color:C.muted,fontWeight:700,marginBottom:8}}>Sem setor <span style={{color:C.line}}>·</span> {semSetor.length}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{semSetor.map(Linha)}</div>
        </div>
      )}
      {lista.length===0 && equipamentos.length>0 && <p style={{fontSize:13,color:C.muted}}>Nenhum equipamento com "{busca}".</p>}
    </div>

    {form && <FormEquip setores={setores} equip={form.equip} onFechar={()=>setForm(null)} onSalvo={recarregar}/>}
  </>);
}
