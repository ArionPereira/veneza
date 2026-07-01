import React from "react";
import { C, SERIF } from "../constants.js";
import { NOMES, hojeISO, addDias, fromISO, fmtData, intervalo } from "../dates.js";
import { SectionTitle } from "../ui.jsx";

export function Mural({cardapio, pratoMap, tiposRefeicao}) {
  const datas  = intervalo(hojeISO(), addDias(hojeISO(), 6));
  const ativos = tiposRefeicao;
  return (<>
    <SectionTitle>Mural do refeitório — próximos 7 dias</SectionTitle>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginTop:-6}}>
      <p style={{fontSize:13,color:C.muted,margin:0}}>Visão limpa, sem custos — para imprimir ou exibir numa TV.</p>
      <button className="no-print" onClick={()=>window.print()} title="Imprimir ou salvar em PDF"
        style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"9px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7,whiteSpace:"nowrap"}}>
        <span aria-hidden>🖨</span> Imprimir / PDF
      </button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:14}}>
      {datas.map(d=>{
        const dia    = cardapio[d]||{};
        const dd     = fromISO(d);
        const temAlgo= ativos.some(t=>dia[t.id]&&dia[t.id].pratos.length);
        return (
          <div key={d} style={{background:C.card,border:"1px solid "+C.line,borderTop:"4px solid "+C.accent,borderRadius:12,padding:"16px 16px 18px",opacity:temAlgo?1:0.55}}>
            <div style={{fontFamily:SERIF,fontSize:17,color:C.brand}}>{NOMES[dd.getDay()]}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:10}}>{fmtData(d)}</div>
            {!temAlgo && <div style={{fontSize:13,color:C.muted}}>Sem refeição</div>}
            {ativos.map(t=>{
              const r = dia[t.id]; if(!r||!r.pratos.length) return null;
              const princ = r.pratos.map(id=>pratoMap[id]).filter(p=>p&&p.categoria==="Prato principal");
              const resto = r.pratos.map(id=>pratoMap[id]).filter(p=>p&&p.categoria!=="Prato principal");
              return (
                <div key={t.id} style={{marginBottom:12}}>
                  <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase",color:C.accent2,fontWeight:700,marginBottom:3}}>{t.nome}</div>
                  {princ.map(p=><div key={p.id} style={{fontSize:15,fontWeight:600}}>{p.nome}</div>)}
                  {resto.map(p=><div key={p.id} style={{fontSize:13,color:C.ink}}>{p.nome}</div>)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  </>);
}
