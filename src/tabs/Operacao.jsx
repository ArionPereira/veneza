import React from "react";
const { useState } = React;
import { C, SH, CATEGORIAS, brl, num } from "../constants.js";
import { hojeISO, addDias, fmtData, intervalo } from "../dates.js";
import { SectionTitle } from "../ui.jsx";

export function Operacao({cardapio, pratoMap, custoPrato, custoPratosLista, tiposRefeicao, insumos, insumoMap, estoque, setEstoqueItem}) {
  const [de,          setDe]          = useState(hojeISO());
  const [ate,         setAte]         = useState(addDias(hojeISO(),6));
  const [showEstoque, setShowEstoque] = useState(false);

  const inp  = {border:"1px solid "+C.line,borderRadius:8,padding:"7px 9px",fontSize:14,background:C.paper,color:C.ink};
  const inp2 = {border:"1px solid "+C.line,borderRadius:6,padding:"6px 8px",fontSize:14,background:C.paper,color:C.ink};
  const cell = {padding:"9px 12px",borderBottom:"1px solid "+C.line,fontSize:14};
  const datas = intervalo(de, ate);

  const base = {}; const porCat = {}; let diasComMenu=0, totalRef=0, totalAlimento=0;
  datas.forEach(d=>{
    const dia = cardapio[d]||{}; let teve = false;
    Object.keys(dia).forEach(rid=>{
      const m = dia[rid]; const ref = m.previsto||0;
      if (!m.pratos||!m.pratos.length) return;
      teve = true; totalRef += ref;
      m.pratos.forEach(id=>{
        const p = pratoMap[id]; if(!p) return;
        const cp = custoPrato(p)*ref; porCat[p.categoria]=(porCat[p.categoria]||0)+cp; totalAlimento+=cp;
        p.ficha.forEach(l=>{ base[l.insumoId]=(base[l.insumoId]||0)+((Number(l.g)||0)/1000)*ref; });
      });
    });
    if (teve) diasComMenu++;
  });

  const linhas = Object.keys(base).map(id=>{
    const i          = insumoMap[id];
    const necessidade= base[id]*(i?i.fc:1);
    const est        = Number((estoque||{})[id])||0;
    const comprar    = Math.max(0, necessidade-est);
    const custo      = comprar*(i?i.preco:0);
    return {id, nome:i?i.nome:id, unidade:i?i.unidade:"kg", necessidade, est, comprar, custo};
  }).sort((a,b)=>b.custo-a.custo);

  const totalCompra = linhas.reduce((s,l)=>s+l.custo, 0);
  const catKeys     = CATEGORIAS.filter(c=>porCat[c]);
  const maxCat      = Math.max(0.01, ...catKeys.map(c=>porCat[c]));
  const atalho      = (n) => { setDe(hojeISO()); setAte(addDias(hojeISO(),n-1)); };
  const passada     = de < hojeISO();

  return (<>
    <SectionTitle>Comprar de ... ate</SectionTitle>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>De</div><input type="date" value={de} onChange={e=>setDe(e.target.value)} style={inp}/></div>
      <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Até</div><input type="date" value={ate} onChange={e=>setAte(e.target.value)} style={inp}/></div>
      <div style={{display:"flex",gap:6}}>
        {[["7 dias",7],["15 dias",15],["30 dias",30]].map(([l,n])=>(
          <button key={l} onClick={()=>atalho(n)}
            style={{border:"1px solid "+C.line,background:C.card,color:C.brand,borderRadius:8,padding:"8px 12px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>
    </div>

    {passada && <div style={{marginTop:10,padding:"9px 12px",background:"#FBF1DC",border:"1px solid "+C.wheat,borderRadius:10,color:"#8A6400",fontSize:13}}>
      ⚠ A data inicial ({fmtData(de)}) é anterior a hoje. Você está calculando compras de um período que já passou.
    </div>}

    <p style={{fontSize:13,color:C.muted,marginTop:10}}>
      {diasComMenu} dia(s) com refeição · {num(totalRef)} refeições · custo de alimento {brl(totalAlimento)} (soma de todas as refeições do período).
      Edite o <b>estoque</b> na tabela; <b>a comprar = necessidade − estoque</b>.
    </p>

    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH,overflowX:"auto"}}>
      <table style={{width:"100%",minWidth:580}}>
        <thead><tr style={{background:C.sage}}>
          <th style={{...cell,textAlign:"left",fontWeight:700}}>Insumo</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Necessidade</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Estoque</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>A comprar</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Custo</th>
        </tr></thead>
        <tbody>
          {linhas.length===0 && <tr><td style={cell} colSpan={5}><span style={{color:C.muted}}>Sem refeições no período selecionado.</span></td></tr>}
          {linhas.map(l=>(
            <tr key={l.id}>
              <td style={cell}>{l.nome}</td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums",color:C.muted}}>{l.necessidade.toFixed(1)} {l.unidade}</td>
              <td style={{...cell,textAlign:"right"}}>
                <input type="number" step="0.5" min="0" value={(estoque||{})[l.id]||0}
                  onChange={e=>setEstoqueItem(l.id,parseFloat(e.target.value)||0)}
                  style={{...inp2,width:76,textAlign:"right"}}/>
                <span style={{color:C.muted,marginLeft:3,fontSize:12}}>{l.unidade}</span>
              </td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:700,color:l.comprar>0?C.ink:C.brand2}}>
                {l.comprar>0 ? l.comprar.toFixed(1)+" "+l.unidade : "ok"}
              </td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>{brl(l.custo)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={{background:C.sage}}>
          <td style={{...cell,fontWeight:700}}>Total a comprar</td>
          <td style={cell}></td><td style={cell}></td><td style={cell}></td>
          <td style={{...cell,textAlign:"right",fontWeight:700,color:C.brand,fontVariantNumeric:"tabular-nums"}}>{brl(totalCompra)}</td>
        </tr></tfoot>
      </table>
    </div>

    <SectionTitle>Onde o custo está indo (no período)</SectionTitle>
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,boxShadow:SH,padding:"16px 18px"}}>
      {catKeys.length===0 && <p style={{color:C.muted,fontSize:13,margin:0}}>Sem cardápio no período. Monte no calendário.</p>}
      {catKeys.map(cat=>(
        <div key={cat} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
            <span>{cat}</span>
            <span style={{fontVariantNumeric:"tabular-nums",color:C.muted}}>{brl(porCat[cat])} · {((porCat[cat]/totalAlimento)*100||0).toFixed(0)}%</span>
          </div>
          <div style={{height:10,background:C.sage,borderRadius:6,overflow:"hidden"}}>
            <div style={{width:(porCat[cat]/maxCat)*100+"%",height:"100%",background:cat==="Prato principal"?C.brand:C.accent}}/>
          </div>
        </div>
      ))}
    </div>

    {(()=>{
      const abaixo = insumos.filter(i=>(Number(i.minimo)||0)>0 && (Number((estoque||{})[i.id])||0) < (Number(i.minimo)||0));
      return abaixo.length>0
        ? <div style={{margin:"18px 0 0",padding:"9px 12px",background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:10,color:C.clay,fontSize:13,fontWeight:600}}>
            ⚠ {abaixo.length} {abaixo.length===1?"item abaixo":"itens abaixo"} do mínimo: {abaixo.map(i=>i.nome).join(", ")}
          </div>
        : null;
    })()}

    <div style={{borderTop:"1px solid "+C.line,marginTop:18,paddingTop:14}}>
      <button onClick={()=>setShowEstoque(s=>!s)}
        style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,fontWeight:600,color:C.brand,display:"flex",alignItems:"center",gap:6,padding:0,fontFamily:"Georgia,'Times New Roman',serif"}}>
        {showEstoque?"▾":"▸"} Estoque — todos os itens
      </button>
    </div>

    {showEstoque && <>
      <p style={{fontSize:13,color:C.muted,marginTop:8}}>Contagem completa da despensa. Edite aqui o que tem de cada insumo cadastrado. O <b>mínimo</b> se ajusta em Fichas &amp; custos.</p>
      <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH,overflowX:"auto"}}>
        <table style={{width:"100%",minWidth:460}}>
          <thead><tr style={{background:C.sage}}>
            <th style={{...cell,textAlign:"left",fontWeight:700}}>Insumo</th>
            <th style={{...cell,textAlign:"right",fontWeight:700}}>Em estoque</th>
            <th style={{...cell,textAlign:"right",fontWeight:700}}>Mínimo</th>
          </tr></thead>
          <tbody>
            {insumos.slice().sort((a,b)=>a.nome.localeCompare(b.nome)).map(i=>{
              const est  = Number((estoque||{})[i.id])||0;
              const min  = Number(i.minimo)||0;
              const baixo= min>0 && est<min;
              return (
                <tr key={i.id} style={baixo?{background:"#FBEAE3"}:null}>
                  <td style={cell}>{i.nome}{baixo && <span style={{marginLeft:6,fontSize:11,color:C.clay,fontWeight:700}}>● baixo</span>}</td>
                  <td style={{...cell,textAlign:"right"}}>
                    <input type="number" step="0.5" min="0" value={est}
                      onChange={e=>setEstoqueItem(i.id,parseFloat(e.target.value)||0)}
                      style={{...inp2,width:90,textAlign:"right",borderColor:baixo?C.clay:C.line}}/>
                    <span style={{color:C.muted,marginLeft:4,fontSize:12}}>{i.unidade}</span>
                  </td>
                  <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums",color:C.muted}}>{min>0?min.toFixed(1)+" "+i.unidade:"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>}
  </>);
}
