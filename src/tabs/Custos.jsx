import React from "react";
const { useState } = React;
import { C, SH, SH2, SERIF, CATEGORIAS, UNIDADES, rotuloQtd, brl } from "../constants.js";
import { SectionTitle } from "../ui.jsx";
import { PrecoCeasaCell, AtualizarCeasa, RefCarnes, ConsultaCeasa } from "../ceasa.jsx";

// ---------------------------------------------------------------------------
// FichaCard
// ---------------------------------------------------------------------------

function FichaCard({prato, insumos, insumoMap, custoLinha, custoPrato, inp, hiName, updatePrato, removePrato, addLinha, updateLinha, removeLinha, tiposRefeicao=[]}) {
  const [open, setOpen] = useState(false);
  const total = custoPrato(prato);
  const refsDoPrato = prato.refeicoes || []; // vazio = serve todas as refeições
  const togRef = (id) => { const atual = prato.refeicoes || []; const nova = atual.includes(id) ? atual.filter(x=>x!==id) : [...atual, id]; updatePrato(prato.id, "refeicoes", nova); };
  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:C.sage,borderBottom:open?"1px solid "+C.line:"none",flexWrap:"wrap"}}>
        <button onClick={()=>setOpen(o=>!o)} style={{border:"none",background:"transparent",cursor:"pointer",fontSize:14,color:C.brand,width:18}}>{open?"▾":"▸"}</button>
        <input value={prato.nome} onChange={e=>updatePrato(prato.id,"nome",e.target.value)} style={{...inp,flex:"2 1 160px",fontWeight:600,...hiName}}/>
        <select value={prato.categoria} onChange={e=>updatePrato(prato.id,"categoria",e.target.value)} style={{...inp,flex:"1 1 120px"}}>
          {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{fontFamily:SERIF,fontSize:20,color:C.brand,fontVariantNumeric:"tabular-nums",minWidth:90,textAlign:"right"}}>{brl(total)}</span>
        <button onClick={()=>removePrato(prato.id)} style={{border:"none",background:"transparent",color:C.clay,cursor:"pointer",fontSize:18}}>&times;</button>
      </div>
      {open && (
        <div style={{padding:"10px 14px",overflowX:"auto"}}>
          <table style={{width:"100%",minWidth:420}}>
            <thead><tr>
              <th style={{textAlign:"left",fontSize:11,color:C.muted,padding:"4px 6px"}}>Ingrediente</th>
              <th style={{textAlign:"right",fontSize:11,color:C.muted,padding:"4px 6px"}}>Qtd cru/pessoa</th>
              <th style={{textAlign:"right",fontSize:11,color:C.muted,padding:"4px 6px"}}>FC</th>
              <th style={{textAlign:"right",fontSize:11,color:C.muted,padding:"4px 6px"}}>Custo</th>
              <th style={{width:30}}></th>
            </tr></thead>
            <tbody>
              {prato.ficha.map((l,idx)=>{ const ins = insumoMap[l.insumoId]; return (
                <tr key={idx}>
                  <td style={{padding:"3px 6px"}}>
                    <select value={l.insumoId} onChange={e=>updateLinha(prato.id,idx,"insumoId",e.target.value)} style={{...inp,width:"100%"}}>
                      {insumos.map(i=><option key={i.id} value={i.id}>{i.nome}</option>)}
                    </select>
                  </td>
                  <td style={{padding:"3px 6px",textAlign:"right",whiteSpace:"nowrap"}}>
                    <input type="number" step={ins&&ins.unidade==="un"?"1":"5"} min="0" value={l.g}
                      onChange={e=>updateLinha(prato.id,idx,"g",parseFloat(e.target.value)||0)}
                      style={{...inp,width:64,textAlign:"right"}}/>
                    <span style={{marginLeft:5,fontSize:12,color:C.muted}}>{rotuloQtd(ins&&ins.unidade)}</span>
                  </td>
                  <td style={{padding:"3px 6px",textAlign:"right",color:C.muted,fontVariantNumeric:"tabular-nums"}}>{ins?Number(ins.fc).toFixed(2):"—"}</td>
                  <td style={{padding:"3px 6px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{brl(custoLinha(l))}</td>
                  <td style={{padding:"3px 6px",textAlign:"center"}}>
                    <button onClick={()=>removeLinha(prato.id,idx)} style={{border:"none",background:"transparent",color:C.clay,cursor:"pointer",fontSize:15}}>&times;</button>
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
          <button onClick={()=>addLinha(prato.id)}
            style={{marginTop:8,background:"transparent",color:C.brand,border:"1px dashed "+C.brand2,borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer"}}>
            + ingrediente
          </button>
          {tiposRefeicao.length>0 && (
            <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid "+C.line}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:6}}>Serve em quais refeições? <span style={{fontWeight:400}}>(nenhuma marcada = serve em todas)</span></div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {tiposRefeicao.map(t=>{ const on = refsDoPrato.includes(t.id); return (
                  <button key={t.id} type="button" onClick={()=>togRef(t.id)}
                    style={{border:"1px solid "+(on?C.brand:C.line),background:on?C.brand:C.card,color:on?"#fff":C.muted,borderRadius:20,padding:"5px 11px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    {t.nome}
                  </button>
                ); })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custos (exportado)
// ---------------------------------------------------------------------------

const normBusca = (s) => (s||"").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();

export function Custos({insumos, insumoMap, pratos, custoLinha, custoPrato, updateInsumo, addInsumo, removeInsumo, ceasa, setCeasa, updatePrato, addPrato, removePrato, addLinha, updateLinha, removeLinha, tiposRefeicao=[]}) {
  const [view, setView] = useState("fichas");
  const [busca, setBusca] = useState("");
  const inp  = {border:"1px solid "+C.line,borderRadius:6,padding:"6px 8px",fontSize:14,background:C.paper,color:C.ink};
  const cell = {padding:"8px 10px",borderBottom:"1px solid "+C.line,fontSize:14};
  const toolbar = {display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",margin:"14px 0 4px"};
  const addBtn  = {background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"};
  const buscaInp= {...inp,flex:"1 1 200px",maxWidth:300,padding:"9px 11px"};

  const q = normBusca(busca);
  const hiName = q ? {background:"#FFF7DA"} : null;
  const insumosFiltrados = q ? insumos.filter(i=>normBusca(i.nome).includes(q)) : insumos;
  const pratosFiltrados  = q ? pratos.filter(p=>normBusca(p.nome).includes(q)) : pratos;

  return (<>
    <div style={{display:"flex",gap:4,marginTop:8}}>
      {[["fichas","Pratos (fichas técnicas)"],["insumos","Insumos & preços"],["ceasa","Consultar CEASA"]].map(([id,label])=>(
        <button key={id} onClick={()=>{ setView(id); setBusca(""); }}
          style={{border:"1px solid "+C.line,cursor:"pointer",fontSize:13,fontWeight:view===id?700:500,padding:"8px 14px",borderRadius:8,background:view===id?C.card:"transparent",color:view===id?C.brand:C.muted}}>
          {label}
        </button>
      ))}
    </div>

    {view==="insumos" && (<>
      <SectionTitle>Insumos e preço de compra</SectionTitle>
      <p style={{fontSize:13,color:C.muted,marginTop:-6}}><b>FC</b> = fator de correção (peso bruto ÷ líquido): cobre osso, casca e aparas — o que se compra a mais. Mexeu no preço, todos os pratos recalculam.</p>
      <div style={toolbar}>
        <button onClick={addInsumo} style={addBtn}>+ Adicionar insumo</button>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar insumo…" style={buscaInp}/>
      </div>
      <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH,overflowX:"auto",WebkitOverflowScrolling:"touch",marginTop:12}}>
        <table style={{width:"100%",minWidth:420}}>
          <thead><tr style={{background:C.sage}}>
            <th style={{...cell,textAlign:"left",fontWeight:700}}>Insumo</th>
            <th style={{...cell,textAlign:"center",fontWeight:700}}>Un.</th>
            <th style={{...cell,textAlign:"right",fontWeight:700}}>Preço</th>
            <th style={{...cell,textAlign:"center",fontWeight:700}}>FC</th>
            <th style={{...cell,textAlign:"center",fontWeight:700}}>Mín.</th>
            <th style={{...cell,width:36}}></th>
          </tr></thead>
          <tbody>
            {insumosFiltrados.map(i=>(
              <tr key={i.id}>
                <td style={cell}><input value={i.nome} onChange={e=>updateInsumo(i.id,"nome",e.target.value)} style={{...inp,width:"100%",...hiName}}/></td>
                <td style={{...cell,textAlign:"center"}}>
                  <select value={i.unidade} onChange={e=>updateInsumo(i.id,"unidade",e.target.value)} style={{...inp,width:64}}>
                    {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td style={{...cell,textAlign:"right"}}><PrecoCeasaCell insumo={i} updateInsumo={updateInsumo} ceasa={ceasa} inp={inp}/></td>
                <td style={{...cell,textAlign:"center"}}>
                  <input type="number" step="0.05" min="1" value={i.fc}
                    onChange={e=>updateInsumo(i.id,"fc",parseFloat(e.target.value)||1)}
                    style={{...inp,width:64,textAlign:"center"}}/>
                </td>
                <td style={{...cell,textAlign:"center"}}>
                  <input type="number" step="0.5" min="0" value={i.minimo||0}
                    onChange={e=>updateInsumo(i.id,"minimo",parseFloat(e.target.value)||0)}
                    style={{...inp,width:60,textAlign:"center"}}/>
                </td>
                <td style={{...cell,textAlign:"center"}}>
                  <button onClick={()=>removeInsumo(i.id)} style={{border:"none",background:"transparent",color:C.clay,cursor:"pointer",fontSize:18}}>&times;</button>
                </td>
              </tr>
            ))}
            {insumosFiltrados.length===0 && <tr><td colSpan={6} style={{...cell,textAlign:"center",color:C.muted}}>Nenhum insumo com "{busca}".</td></tr>}
          </tbody>
        </table>
      </div>
      <AtualizarCeasa insumos={insumos} updateInsumo={updateInsumo} ceasa={ceasa} setCeasa={setCeasa}/>
      <RefCarnes/>
    </>)}

    {view==="fichas" && (<>
      <SectionTitle>Fichas técnicas</SectionTitle>
      <p style={{fontSize:13,color:C.muted,marginTop:-6}}>Quantidade <b>em cru por pessoa</b> — em <b>g</b> (insumo em kg), <b>mL</b> (litro) ou <b>un</b> (unidade). Custo da porção = qtd × FC × preço, somado por ingrediente.</p>
      <div style={toolbar}>
        <button onClick={addPrato} style={addBtn}>+ Adicionar prato</button>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar prato…" style={buscaInp}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:12}}>
        {pratosFiltrados.map(p=>(
          <FichaCard key={p.id} prato={p} insumos={insumos} insumoMap={insumoMap}
            custoLinha={custoLinha} custoPrato={custoPrato} inp={inp} hiName={hiName}
            updatePrato={updatePrato} removePrato={removePrato}
            addLinha={addLinha} updateLinha={updateLinha} removeLinha={removeLinha}
            tiposRefeicao={tiposRefeicao}/>
        ))}
        {pratosFiltrados.length===0 && <p style={{fontSize:13,color:C.muted}}>Nenhum prato com "{busca}".</p>}
      </div>
    </>)}

    {view==="ceasa" && (<>
      <SectionTitle>Consultar cotação do CEASA-GO</SectionTitle>
      <ConsultaCeasa ceasa={ceasa}/>
    </>)}
  </>);
}
