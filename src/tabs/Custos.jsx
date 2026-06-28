import React from "react";
const { useState } = React;
import { C, SH, SH2, SERIF, CATEGORIAS, brl } from "../constants.js";
import { SectionTitle } from "../ui.jsx";
import { PrecoCeasaCell, AtualizarCeasa, RefCarnes, ConsultaCeasa } from "../ceasa.jsx";

// ---------------------------------------------------------------------------
// FichaCard
// ---------------------------------------------------------------------------

function FichaCard({prato, insumos, insumoMap, custoLinha, custoPrato, inp, updatePrato, removePrato, addLinha, updateLinha, removeLinha}) {
  const [open, setOpen] = useState(false);
  const total = custoPrato(prato);
  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:C.sage,borderBottom:open?"1px solid "+C.line:"none",flexWrap:"wrap"}}>
        <button onClick={()=>setOpen(o=>!o)} style={{border:"none",background:"transparent",cursor:"pointer",fontSize:14,color:C.brand,width:18}}>{open?"▾":"▸"}</button>
        <input value={prato.nome} onChange={e=>updatePrato(prato.id,"nome",e.target.value)} style={{...inp,flex:"2 1 160px",fontWeight:600}}/>
        <select value={prato.categoria} onChange={e=>updatePrato(prato.id,"categoria",e.target.value)} style={{...inp,flex:"1 1 120px"}}>
          {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:4}}>
          <input type="checkbox" checked={!!prato.sazonal} onChange={e=>updatePrato(prato.id,"sazonal",e.target.checked)}/> sazonal
        </label>
        <span style={{fontFamily:SERIF,fontSize:20,color:C.brand,fontVariantNumeric:"tabular-nums",minWidth:90,textAlign:"right"}}>{brl(total)}</span>
        <button onClick={()=>removePrato(prato.id)} style={{border:"none",background:"transparent",color:C.clay,cursor:"pointer",fontSize:18}}>&times;</button>
      </div>
      {open && (
        <div style={{padding:"10px 14px",overflowX:"auto"}}>
          <table style={{width:"100%",minWidth:420}}>
            <thead><tr>
              <th style={{textAlign:"left",fontSize:11,color:C.muted,padding:"4px 6px"}}>Ingrediente</th>
              <th style={{textAlign:"right",fontSize:11,color:C.muted,padding:"4px 6px"}}>g cru/pessoa</th>
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
                  <td style={{padding:"3px 6px",textAlign:"right"}}>
                    <input type="number" step="5" min="0" value={l.g}
                      onChange={e=>updateLinha(prato.id,idx,"g",parseFloat(e.target.value)||0)}
                      style={{...inp,width:80,textAlign:"right"}}/>
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
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custos (exportado)
// ---------------------------------------------------------------------------

export function Custos({insumos, insumoMap, pratos, custoLinha, custoPrato, updateInsumo, addInsumo, removeInsumo, ceasa, setCeasa, updatePrato, addPrato, removePrato, addLinha, updateLinha, removeLinha}) {
  const [view, setView] = useState("fichas");
  const inp  = {border:"1px solid "+C.line,borderRadius:6,padding:"6px 8px",fontSize:14,background:C.paper,color:C.ink};
  const cell = {padding:"8px 10px",borderBottom:"1px solid "+C.line,fontSize:14};

  return (<>
    <div style={{display:"flex",gap:4,marginTop:8}}>
      {[["fichas","Pratos (fichas técnicas)"],["insumos","Insumos & preços"],["ceasa","Consultar CEASA"]].map(([id,label])=>(
        <button key={id} onClick={()=>setView(id)}
          style={{border:"1px solid "+C.line,cursor:"pointer",fontSize:13,fontWeight:view===id?700:500,padding:"8px 14px",borderRadius:8,background:view===id?C.card:"transparent",color:view===id?C.brand:C.muted}}>
          {label}
        </button>
      ))}
    </div>

    {view==="insumos" && (<>
      <SectionTitle>Insumos e preço de compra</SectionTitle>
      <p style={{fontSize:13,color:C.muted,marginTop:-6}}><b>FC</b> = fator de correção (peso bruto ÷ líquido): cobre osso, casca e aparas — o que se compra a mais. Mexeu no preço, todos os pratos recalculam.</p>
      <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH,overflowX:"auto",marginTop:12}}>
        <table style={{width:"100%",minWidth:420}}>
          <thead><tr style={{background:C.sage}}>
            <th style={{...cell,textAlign:"left",fontWeight:700}}>Insumo</th>
            <th style={{...cell,textAlign:"center",fontWeight:700}}>Un.</th>
            <th style={{...cell,textAlign:"right",fontWeight:700}}>Preço/kg</th>
            <th style={{...cell,textAlign:"center",fontWeight:700}}>FC</th>
            <th style={{...cell,textAlign:"center",fontWeight:700}}>Mín.</th>
            <th style={{...cell,width:36}}></th>
          </tr></thead>
          <tbody>
            {insumos.map(i=>(
              <tr key={i.id}>
                <td style={cell}><input value={i.nome} onChange={e=>updateInsumo(i.id,"nome",e.target.value)} style={{...inp,width:"100%"}}/></td>
                <td style={{...cell,textAlign:"center"}}>
                  <select value={i.unidade} onChange={e=>updateInsumo(i.id,"unidade",e.target.value)} style={{...inp,width:64}}>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
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
          </tbody>
        </table>
      </div>
      <button onClick={addInsumo}
        style={{marginTop:14,background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
        + Adicionar insumo
      </button>
      <AtualizarCeasa insumos={insumos} updateInsumo={updateInsumo} ceasa={ceasa} setCeasa={setCeasa}/>
      <RefCarnes/>
    </>)}

    {view==="fichas" && (<>
      <SectionTitle>Fichas técnicas</SectionTitle>
      <p style={{fontSize:13,color:C.muted,marginTop:-6}}>Gramagem <b>em cru por pessoa</b>. Custo da porção = (g ÷ 1000) × FC × preço/kg, somado por ingrediente.</p>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:12}}>
        {pratos.map(p=>(
          <FichaCard key={p.id} prato={p} insumos={insumos} insumoMap={insumoMap}
            custoLinha={custoLinha} custoPrato={custoPrato} inp={inp}
            updatePrato={updatePrato} removePrato={removePrato}
            addLinha={addLinha} updateLinha={updateLinha} removeLinha={removeLinha}/>
        ))}
      </div>
      <button onClick={addPrato}
        style={{marginTop:14,background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
        + Adicionar prato
      </button>
    </>)}

    {view==="ceasa" && (<>
      <SectionTitle>Consultar cotação do CEASA-GO</SectionTitle>
      <ConsultaCeasa ceasa={ceasa}/>
    </>)}
  </>);
}
