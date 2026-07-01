import React from "react";
const { useState, useEffect } = React;
import { C, SERIF, SH, SH2, CATEGORIAS, brl, num } from "../constants.js";
import { NOMES3, MESES, iso, fromISO, hojeISO, addDias, wdDe, fmtData, fmtDataLonga, confirmarExcluir } from "../dates.js";

// ---------------------------------------------------------------------------
// MealEditor
// ---------------------------------------------------------------------------

function MealEditor({sel, tipo, dref, pratos, pratoMap, custoPrato, custoPratosLista, addPratoMeal, removePratoMeal, removerRefDia, setPrevisto, setRealizado}) {
  const [add, setAdd] = useState("");
  const disp   = pratos.filter(p=>!dref.pratos.includes(p.id));
  const porCat = {}; dref.pratos.forEach(id=>{ const p=pratoMap[id]; if(!p)return; (porCat[p.categoria]=porCat[p.categoria]||[]).push(p); });
  const percap      = custoPratosLista(dref.pratos);
  const prev        = dref.previsto||0;
  const real        = dref.realizado;
  const custoPrev   = percap*prev;
  const percapReal  = (dref.custoCong!=null ? dref.custoCong : percap);
  const custoReal   = real!=null ? percapReal*real : null;
  const inp = {border:"1px solid "+C.line,borderRadius:6,padding:"5px 7px",fontSize:13,background:C.paper,color:C.ink};

  return (
    <div style={{border:"1px solid "+C.line,borderRadius:10,overflow:"hidden"}}>
      <div style={{background:C.sage,padding:"10px 12px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <strong style={{fontFamily:SERIF,fontSize:16,color:C.brand,flex:"1 1 auto"}}>{tipo.nome}</strong>
        <span style={{fontSize:12,color:C.muted}}>Previsto</span>
        <input type="number" min="0" value={prev}
          onChange={e=>setPrevisto(sel,tipo.id,parseInt(e.target.value)||0)}
          style={{...inp,width:64,textAlign:"right"}}/>
        <span style={{fontSize:12,color:C.muted}}>Realizado</span>
        <input type="number" min="0" placeholder="—" value={real==null?"":real}
          onChange={e=>setRealizado(sel,tipo.id, e.target.value===""?null:(parseInt(e.target.value)||0))}
          style={{...inp,width:64,textAlign:"right"}}/>
        <button onClick={()=>{ if(confirmarExcluir(sel,"a refeição "+tipo.nome)) removerRefDia(sel,tipo.id); }}
          title="Remover refeição"
          style={{border:"none",background:"transparent",color:C.clay,cursor:"pointer",fontSize:16}}>&times;</button>
      </div>
      <div style={{padding:"6px 12px",fontSize:12,color:C.muted,borderBottom:"1px solid "+C.line,display:"flex",gap:14,flexWrap:"wrap"}}>
        <span>{brl(percap)}/pessoa</span>
        <span>Custo previsto: <b style={{color:C.ink}}>{brl(custoPrev)}</b></span>
        {custoReal!=null && (
          <span>Realizado: <b style={{color:C.ink}}>{brl(custoReal)}</b> ({real-prev>=0?"+":""}{real-prev} ref)
            {dref.custoCong!=null && <span title="Custo congelado no lançamento" style={{marginLeft:4,color:C.accent}}>&#10052;</span>}
          </span>
        )}
      </div>
      <div style={{padding:"8px 12px"}}>
        {dref.pratos.length===0 && <p style={{color:C.muted,fontSize:13,margin:"2px 0 8px"}}>Sem pratos. Adicione abaixo.</p>}
        {CATEGORIAS.filter(c=>porCat[c]).map(cat=>(
          <div key={cat} style={{marginBottom:6}}>
            <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",color:C.muted,marginBottom:2}}>{cat}</div>
            {porCat[cat].map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:14,padding:"2px 0"}}>
                <span>{p.nome}</span>
                <span style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:C.muted,fontVariantNumeric:"tabular-nums"}}>{brl(custoPrato(p))}</span>
                  <button onClick={()=>removePratoMeal(sel,tipo.id,p.id)}
                    style={{border:"none",background:"transparent",color:C.clay,cursor:"pointer",fontSize:16,padding:"0 4px"}}>&times;</button>
                </span>
              </div>
            ))}
          </div>
        ))}
        <select value={add} onChange={e=>{ addPratoMeal(sel,tipo.id,e.target.value); setAdd(""); }}
          style={{...inp,width:"100%",marginTop:6,padding:"7px 9px"}}>
          <option value="">+ adicionar prato...</option>
          {CATEGORIAS.map(cat=>{ const it=disp.filter(p=>p.categoria===cat); if(!it.length) return null; return (
            <optgroup key={cat} label={cat}>
              {it.map(p=><option key={p.id} value={p.id}>{p.nome} - {brl(custoPrato(p))}</option>)}
            </optgroup>
          ); })}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditorDia
// ---------------------------------------------------------------------------

function EditorDia({sel, cardapio, tiposRefeicao, pratos, pratoMap, custoPrato, custoPratosLista, addPratoMeal, removePratoMeal, ativarRefDia, removerRefDia, setPrevisto, setRealizado, copiarDia, copiarDiaIntervalo, limparDia, copiarSemana, recalcularDia, segDe}) {
  const [copiaDe,   setCopiaDe]   = useState("");
  const [repeteDe,  setRepeteDe]  = useState("");
  const [repeteAte, setRepeteAte] = useState("");
  const [semDest,   setSemDest]   = useState("");
  const [showCopiar,setShowCopiar]= useState(false);

  const tipos    = tiposRefeicao||[];
  const dia      = cardapio[sel]||{};
  const presentes = tipos.filter(t=>dia[t.id]);
  const ausentes  = tipos.filter(t=>!dia[t.id]);
  const inp = {border:"1px solid "+C.line,borderRadius:8,padding:"7px 9px",fontSize:13,background:C.paper,color:C.ink};
  const temReal = Object.keys(dia).some(rid=>dia[rid].realizado!=null);
  const nomeTipo = (id) => { const t=tipos.find(x=>x.id===id); return t?t.nome:id; };

  const resumoFull = (dataISO) => {
    const d = cardapio[dataISO]; if(!d) return [];
    return Object.keys(d).filter(rid=>d[rid].pratos&&d[rid].pratos.length).map(rid=>{
      const nomes = d[rid].pratos.map(id=>pratoMap[id]).filter(Boolean).map(p=>p.nome);
      return {id:rid, nome:nomeTipo(rid), prev:d[rid].previsto, pratos:nomes};
    });
  };

  const [selTrazer,  setSelTrazer]  = useState([]);
  const [selRepetir, setSelRepetir] = useState([]);
  useEffect(()=>{ setSelTrazer(resumoFull(copiaDe).map(m=>m.id)); }, [copiaDe]);
  useEffect(()=>{ setSelRepetir(resumoFull(sel).map(m=>m.id)); }, [sel]);

  const togTrazer  = (id) => setSelTrazer(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const togRepetir = (id) => setSelRepetir(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);

  const fonteTrazer  = resumoFull(copiaDe);
  const fonteRepetir = resumoFull(sel);
  const nTrazer  = fonteTrazer.filter(m=>selTrazer.includes(m.id)).length;
  const nRepetir = fonteRepetir.filter(m=>selRepetir.includes(m.id)).length;

  const lab    = {fontSize:11,color:C.muted,marginBottom:4};
  const btn    = (ok) => ({background:ok?C.brand:C.line,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:ok?"pointer":"default",whiteSpace:"nowrap"});
  const rowBox = {border:"1px solid "+C.line,borderRadius:10,padding:"12px 14px",background:C.paper,marginBottom:10};

  const mealRow = (m, checked, onToggle) => (
    <label key={m.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"6px 2px",cursor:"pointer"}}>
      <input type="checkbox" checked={checked} onChange={()=>onToggle(m.id)} style={{accentColor:C.brand,marginTop:3}}/>
      <div style={{lineHeight:1.3}}>
        <div style={{fontSize:13,fontWeight:600,color:C.ink}}>{m.nome} <span style={{color:C.muted,fontWeight:400}}>· {num(m.prev)} prev.</span></div>
        <div style={{fontSize:12,color:C.muted}}>{m.pratos.join(", ")}</div>
      </div>
    </label>
  );

  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH}}>
      <div style={{background:C.brand,color:"#fff",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <strong style={{fontFamily:SERIF,fontSize:18}}>{fmtDataLonga(sel)}</strong>
        {temReal && (
          <button onClick={()=>recalcularDia(sel)}
            title="Recongela o custo dos dias com realizado lançado, usando os preços atuais"
            style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.5)",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer"}}>
            &#8635; Recalcular custo
          </button>
        )}
      </div>

      <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
        {presentes.map(t=>(
          <MealEditor key={t.id} sel={sel} tipo={t} dref={dia[t.id]} pratos={pratos} pratoMap={pratoMap}
            custoPrato={custoPrato} custoPratosLista={custoPratosLista}
            addPratoMeal={addPratoMeal} removePratoMeal={removePratoMeal}
            removerRefDia={removerRefDia} setPrevisto={setPrevisto} setRealizado={setRealizado}/>
        ))}
        {presentes.length===0 && <p style={{color:C.muted,fontSize:14,margin:"2px 0"}}>Nenhuma refeição neste dia ainda. Adicione abaixo.</p>}
        {ausentes.length>0 && (
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:C.muted}}>Adicionar refeição:</span>
            {ausentes.map(t=>(
              <button key={t.id} onClick={()=>ativarRefDia(sel,t.id)}
                style={{background:"#fff",border:"1px dashed "+C.brand2,color:C.brand,borderRadius:20,padding:"6px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                + {t.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{borderTop:"1px solid "+C.line,padding:"12px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setShowCopiar(s=>!s)}
            style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,color:C.brand,display:"flex",alignItems:"center",gap:6,padding:0}}>
            {showCopiar?"▾":"▸"} Copiar / repetir cardápio
          </button>
          <button onClick={()=>{ if(confirmarExcluir(sel,"TODAS as refeições do dia")) limparDia(sel); }}
            style={{background:"transparent",color:C.clay,border:"1px solid "+C.clay,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>
            Limpar dia
          </button>
        </div>

        {showCopiar && <div style={{marginTop:14}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Escolha a origem, veja o cardápio dela e marque quais refeições transferir. As demais refeições do dia de destino são mantidas.</div>

          <div style={rowBox}>
            <div style={lab}>1. Trazer de outro dia para <b>{fmtData(sel)}</b></div>
            <input type="date" value={copiaDe} onChange={e=>setCopiaDe(e.target.value)} style={inp}/>
            {copiaDe && (fonteTrazer.length===0
              ? <div style={{fontSize:12,color:C.muted,marginTop:8}}>{fmtData(copiaDe)} está vazio — nada para trazer.</div>
              : <div style={{marginTop:8}}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:2}}>Cardápio de {fmtData(copiaDe)} — marque o que trazer:</div>
                  <div style={{borderTop:"1px solid "+C.line}}>{fonteTrazer.map(m=>mealRow(m,selTrazer.includes(m.id),togTrazer))}</div>
                  <button onClick={()=>{ if(nTrazer) copiarDia(copiaDe,sel,selTrazer); }} disabled={!nTrazer}
                    style={{...btn(nTrazer>0),marginTop:8}}>
                    Trazer {nTrazer>0?"("+nTrazer+")":""} para {fmtData(sel)}
                  </button>
                </div>)}
          </div>

          <div style={rowBox}>
            <div style={lab}>2. Repetir o cardápio de <b>{fmtData(sel)}</b> em outras datas</div>
            {fonteRepetir.length===0
              ? <div style={{fontSize:12,color:C.muted}}>Este dia está sem refeições para repetir.</div>
              : <>
                  <div style={{fontSize:12,color:C.muted,marginBottom:2}}>Marque quais refeições repetir:</div>
                  <div style={{borderTop:"1px solid "+C.line,marginBottom:10}}>{fonteRepetir.map(m=>mealRow(m,selRepetir.includes(m.id),togRepetir))}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
                    <span style={{fontSize:12,color:C.muted}}>de</span>
                    <input type="date" value={repeteDe} onChange={e=>setRepeteDe(e.target.value)} style={inp}/>
                    <span style={{fontSize:12,color:C.muted}}>até (opcional)</span>
                    <input type="date" value={repeteAte} onChange={e=>setRepeteAte(e.target.value)} style={inp}/>
                    <button onClick={()=>{ if(repeteDe&&nRepetir) copiarDiaIntervalo(sel,repeteDe,repeteAte||repeteDe,selRepetir); }}
                      disabled={!(repeteDe&&nRepetir)} style={btn(repeteDe&&nRepetir>0)}>
                      Repetir {nRepetir>0?"("+nRepetir+")":""}
                    </button>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Sem "até" = um dia só. Com intervalo, aplica em todos os dias (ex.: seg a sex).</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",borderTop:"1px dashed "+C.line,paddingTop:10}}>
                    <span style={{fontSize:12,color:C.muted}}>ou repetir a <b>semana toda</b> ({fmtData(segDe(sel))}–{fmtData(addDias(segDe(sel),6))}) em:</span>
                    <input type="date" value={semDest} onChange={e=>setSemDest(e.target.value)} style={inp}/>
                    <button onClick={()=>{ if(semDest&&nRepetir) copiarSemana(sel,semDest,selRepetir); }}
                      disabled={!(semDest&&nRepetir)} style={btn(semDest&&nRepetir>0)}>
                      Copiar semana &#8594;
                    </button>
                    {semDest && <span style={{fontSize:12,color:C.muted}}>→ {fmtData(segDe(semDest))}–{fmtData(addDias(segDe(semDest),6))}</span>}
                  </div>
                </>}
          </div>
        </div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendario (exportado)
// ---------------------------------------------------------------------------

export function Calendario({cardapio, pratos, pratoMap, custoPrato, custoPratosLista, tiposRefeicao, addPratoMeal, removePratoMeal, ativarRefDia, removerRefDia, setPrevisto, setRealizado, copiarDia, copiarDiaIntervalo, limparDia, limparDias, trocarDias, copiarSemana, recalcularDia, segDe}) {
  const hoje = hojeISO(); const ini = fromISO(hoje);
  const [ano, setAno] = useState(ini.getFullYear());
  const [mes, setMes] = useState(ini.getMonth());
  const [sel, setSel] = useState(hoje);
  const [modo, setModo] = useState(null); // null | "limpar" | "trocar"
  const [selDias, setSelDias] = useState([]);

  const togDia    = (d) => setSelDias(s=>s.includes(d)?s.filter(x=>x!==d):[...s,d]);
  const entrarModo= (m) => { setModo(m); setSelDias([]); };
  const sairModo  = () => { setModo(null); setSelDias([]); };

  const confirmarLimpar = () => {
    if(!selDias.length) return;
    const dias = selDias.slice().sort();
    const temPassado = dias.some(d=>d<hoje);
    const lista = dias.map(fmtData).join(", ");
    const msg = (temPassado ? "⚠ ATENÇÃO: há dias que JÁ PASSARAM na seleção (podem estar fechados) — isso altera o histórico.\n\n" : "")
      + "Limpar TODAS as refeições de " + dias.length + " dia(s)?\n\n" + lista;
    if (window.confirm(msg)) { limparDias(dias); sairModo(); }
  };
  const confirmarTrocar = () => {
    if(selDias.length!==2) return;
    const [d1,d2] = selDias.slice().sort();
    const temPassado = [d1,d2].some(d=>d<hoje);
    const msg = (temPassado ? "⚠ ATENÇÃO: um dos dias JÁ PASSOU — isso altera o histórico.\n\n" : "")
      + "Trocar o cardápio entre " + fmtData(d1) + " e " + fmtData(d2) + "?\n\nO que está em cada dia vai para o outro (e vice-versa).";
    if (window.confirm(msg)) { trocarDias(d1,d2); sairModo(); }
  };

  const primeiro  = new Date(ano,mes,1);
  const inicioWd  = primeiro.getDay();
  const start     = new Date(ano,mes,1-inicioWd);
  const celulas   = [];
  for (let i=0; i<42; i++) { const d=new Date(start); d.setDate(start.getDate()+i); celulas.push(d); }

  const navMes = (delta) => { let m=mes+delta, a=ano; if(m<0){m=11;a--;} if(m>11){m=0;a++;} setMes(m); setAno(a); };
  const irHoje = () => { const d=fromISO(hoje); setAno(d.getFullYear()); setMes(d.getMonth()); setSel(hoje); };

  const diaQtd      = (data) => { const dia=cardapio[data]||{}; return Object.keys(dia).filter(rid=>dia[rid].pratos&&dia[rid].pratos.length).length; };
  const cortaNome   = (nm) => nm.split(" ")[0];
  const diaItens    = (data) => { const dia=cardapio[data]||{}; return tiposRefeicao.filter(t=>dia[t.id]&&dia[t.id].pratos&&dia[t.id].pratos.length).map(t=>({nome:cortaNome(t.nome),prev:dia[t.id].previsto||0})); };
  const diaCongelado= (data) => { const dia=cardapio[data]||{}; return Object.keys(dia).some(rid=>dia[rid].realizado!=null||dia[rid].custoCong!=null); };

  return (<>
    <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"flex-start",marginTop:8}}>
      <div style={{flex:"1 1 330px",minWidth:300}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <button onClick={()=>navMes(-1)} style={{border:"1px solid "+C.line,background:C.card,borderRadius:8,padding:"6px 11px",cursor:"pointer",fontSize:16,color:C.brand}}>&#8249;</button>
          <strong style={{fontFamily:SERIF,fontSize:20,color:C.brand,flex:1,textAlign:"center"}}>{MESES[mes]} {ano}</strong>
          <button onClick={()=>navMes(1)} style={{border:"1px solid "+C.line,background:C.card,borderRadius:8,padding:"6px 11px",cursor:"pointer",fontSize:16,color:C.brand}}>&#8250;</button>
          <button onClick={irHoje} style={{border:"1px solid "+C.line,background:C.card,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.muted}}>Hoje</button>
        </div>
        {!modo && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            <button onClick={()=>entrarModo("trocar")}
              style={{border:"1px solid "+C.brand2,background:"transparent",color:C.brand,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>
              ⇄ Trocar 2 dias
            </button>
            <button onClick={()=>entrarModo("limpar")}
              style={{border:"1px solid "+C.clay,background:"transparent",color:C.clay,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>
              Limpar vários dias
            </button>
          </div>
        )}
        {modo==="limpar" && (
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:12,background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:8,padding:"8px 10px"}}>
            <span style={{fontSize:12.5,color:C.clay,fontWeight:600,flex:"1 1 auto"}}>{selDias.length} dia(s) selecionado(s)</span>
            <button onClick={confirmarLimpar} disabled={!selDias.length}
              style={{background:selDias.length?C.clay:C.line,color:"#fff",border:"none",borderRadius:8,padding:"7px 13px",fontSize:13,fontWeight:600,cursor:selDias.length?"pointer":"default"}}>
              Limpar selecionados
            </button>
            <button onClick={sairModo}
              style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"7px 12px",fontSize:13,cursor:"pointer"}}>
              Cancelar
            </button>
          </div>
        )}
        {modo==="trocar" && (
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:12,background:C.sage,border:"1px solid "+C.brand2,borderRadius:8,padding:"8px 10px"}}>
            <span style={{fontSize:12.5,color:C.brand,fontWeight:600,flex:"1 1 auto"}}>{selDias.length} de 2 dias selecionados</span>
            <button onClick={confirmarTrocar} disabled={selDias.length!==2}
              style={{background:selDias.length===2?C.brand:C.line,color:"#fff",border:"none",borderRadius:8,padding:"7px 13px",fontSize:13,fontWeight:600,cursor:selDias.length===2?"pointer":"default"}}>
              ⇄ Trocar
            </button>
            <button onClick={sairModo}
              style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"7px 12px",fontSize:13,cursor:"pointer"}}>
              Cancelar
            </button>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5}}>
          {NOMES3.map(n=><div key={n} style={{textAlign:"center",fontSize:10,letterSpacing:1,textTransform:"uppercase",color:C.muted,paddingBottom:2}}>{n}</div>)}
          {celulas.map((d,i)=>{
            const isoD = iso(d); const noMes = d.getMonth()===mes; const ehHoje = isoD===hoje; const selec = isoD===sel;
            const qtd = diaQtd(isoD); const tem = qtd>0;
            const ativo = !!modo;
            const marcado = ativo && selDias.includes(isoD);
            const clicavel = modo==="limpar" ? tem : true; // troca permite qualquer dia (move se um estiver vazio)
            const corMarca = modo==="trocar" ? C.brand : C.clay;
            const bgMarca  = modo==="trocar" ? "#CFE2F7" : "#FBEAE3";
            const ordem = modo==="trocar" ? selDias.indexOf(isoD) : -1;
            return (
              <button key={i} onClick={()=> ativo ? (clicavel && togDia(isoD)) : setSel(isoD)}
                style={{textAlign:"left",cursor:clicavel?"pointer":"default",minHeight:58,padding:"5px 7px",borderRadius:9,
                  border: marcado? "2px solid "+corMarca : (selec&&!ativo? "2px solid "+C.brand : (ehHoje? "2px solid "+C.accent : "1px solid "+C.line)),
                  background: marcado? bgMarca : (selec&&!ativo? C.sage : (tem? C.sage : C.card)),
                  opacity: noMes?0.4:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:ehHoje?700:500,fontSize:13,color:C.ink}}>{d.getDate()}</span>
                  {ordem>=0
                    ? <span style={{fontSize:10,fontWeight:700,color:"#fff",background:C.brand,borderRadius:"50%",width:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{ordem+1}</span>
                    : (tem && diaCongelado(isoD) && <span title="Custo congelado (realizado lançado)" style={{fontSize:11,color:C.brand2}}>❄</span>)}
                </div>
                {tem && <div style={{marginTop:2}}>{diaItens(isoD).map((m,k)=>(
                  <div key={k} style={{fontSize:9,color:C.brand2,lineHeight:1.3,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nome} <b style={{color:C.brand}}>{num(m.prev)}</b></div>
                ))}</div>}
              </button>
            );
          })}
        </div>
        <p style={{fontSize:11,color:C.muted,marginTop:10}}>{
          modo==="limpar" ? "Toque nos dias que quer limpar (só os que têm cardápio) e confirme em \"Limpar selecionados\"."
          : modo==="trocar" ? "Toque em 2 dias para trocar o cardápio entre eles (① e ②). Se um estiver vazio, o cardápio é movido para ele."
          : "Clique num dia para montar o cardápio ao lado."
        }</p>
      </div>

      <div style={{flex:"1 1 420px",minWidth:300}}>
        <EditorDia sel={sel} cardapio={cardapio} tiposRefeicao={tiposRefeicao} pratos={pratos} pratoMap={pratoMap}
          custoPrato={custoPrato} custoPratosLista={custoPratosLista}
          addPratoMeal={addPratoMeal} removePratoMeal={removePratoMeal}
          ativarRefDia={ativarRefDia} removerRefDia={removerRefDia}
          setPrevisto={setPrevisto} setRealizado={setRealizado}
          copiarDia={copiarDia} copiarDiaIntervalo={copiarDiaIntervalo}
          limparDia={limparDia} copiarSemana={copiarSemana}
          recalcularDia={recalcularDia} segDe={segDe}/>
      </div>
    </div>
  </>);
}
