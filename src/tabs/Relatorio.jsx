import React from "react";
const { useState } = React;
import { C, SH, SERIF, brl, num } from "../constants.js";
import { NOMES3, MESES, hojeISO, fromISO, iso, addDias, fmtData, wdDe } from "../dates.js";
import { SectionTitle, Stat } from "../ui.jsx";

export function Relatorio({cardapio, pratoMap, custoPratosLista, tiposRefeicao}) {
  const hoje = fromISO(hojeISO());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const cell = {padding:"8px 12px",borderBottom:"1px solid "+C.line,fontSize:14};

  const nomeTipo = (id) => { const t=tiposRefeicao.find(x=>x.id===id); return t?t.nome:id; };
  const mainNome = (pratos) => {
    const m = (pratos||[]).map(id=>pratoMap[id]).filter(p=>p&&p.categoria==="Prato principal").map(p=>p.nome);
    return m.join(", ")||"—";
  };

  const dias = new Date(ano, mes+1, 0).getDate();
  let diasComRef=0, totalPrev=0, totalReal=0, custoPrev=0, custoReal=0;
  const porTipo={}; const linhasDia=[];
  for (let d=1; d<=dias; d++) {
    const dataISO = iso(new Date(ano,mes,d)); const dia = cardapio[dataISO]; if(!dia) continue;
    let teve = false;
    Object.keys(dia).forEach(rid=>{
      const m = dia[rid]; if(!m.pratos||!m.pratos.length) return; teve=true;
      const percap     = custoPratosLista(m.pratos);
      const prev       = m.previsto||0;
      const real       = m.realizado;
      const percapReal = (m.custoCong!=null ? m.custoCong : percap);
      const cPrev = percap*prev; const cReal = real!=null ? percapReal*real : 0;
      totalPrev+=prev; custoPrev+=cPrev;
      if (real!=null) { totalReal+=real; custoReal+=cReal; }
      const pt = porTipo[rid]||(porTipo[rid]={prev:0,custoPrev:0,real:0,custoReal:0,temReal:false});
      pt.prev+=prev; pt.custoPrev+=cPrev;
      if (real!=null) { pt.real+=real; pt.custoReal+=cReal; pt.temReal=true; }
      linhasDia.push({dataISO,rid,principal:mainNome(m.pratos),itens:m.pratos.length,prev,real,custo:cPrev});
    });
    if (teve) diasComRef++;
  }
  const medioRef = totalPrev>0 ? custoPrev/totalPrev : 0;
  const navMes   = (delta) => { let m=mes+delta, a=ano; if(m<0){m=11;a--;} if(m>11){m=0;a++;} setMes(m); setAno(a); };

  // histórico de 12 semanas
  const segAtual = (()=>{ const d=new Date(); const off=(d.getDay()+6)%7; d.setDate(d.getDate()-off); return d; })();
  const semanas = [];
  for (let w=11; w>=0; w--) {
    const seg = new Date(segAtual); seg.setDate(segAtual.getDate()-w*7);
    let pPrev=0, pRef=0, pReal=0, pRefReal=0;
    for (let i=0; i<7; i++) {
      const dt  = iso(new Date(seg.getFullYear(),seg.getMonth(),seg.getDate()+i));
      const dia = cardapio[dt]; if(!dia) continue;
      Object.keys(dia).forEach(rid=>{
        const m = dia[rid]; if(!m.pratos||!m.pratos.length) return;
        const percap = custoPratosLista(m.pratos); const prev = m.previsto||0;
        pPrev+=percap*prev; pRef+=prev;
        if (m.realizado!=null) { const pc=(m.custoCong!=null?m.custoCong:percap); pReal+=pc*m.realizado; pRefReal+=m.realizado; }
      });
    }
    semanas.push({ label:fmtData(iso(seg)), prevAvg:pRef>0?pPrev/pRef:0, realAvg:pRefReal>0?pReal/pRefReal:0, temReal:pRefReal>0 });
  }
  const maxAvg = Math.max(0.01, ...semanas.map(s=>Math.max(s.prevAvg,s.realAvg)));

  return (<>
    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,marginBottom:14}}>
      <button onClick={()=>navMes(-1)} style={{border:"1px solid "+C.line,background:C.card,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:16,color:C.brand}}>&#8249;</button>
      <strong style={{fontFamily:SERIF,fontSize:22,color:C.brand,minWidth:180,textAlign:"center"}}>{MESES[mes]} {ano}</strong>
      <button onClick={()=>navMes(1)} style={{border:"1px solid "+C.line,background:C.card,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:16,color:C.brand}}>&#8250;</button>
    </div>

    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <Stat rotulo="Dias com refeição"   valor={num(diasComRef)} sub={"em "+MESES[mes]}/>
      <Stat rotulo="Refeições previstas" valor={num(totalPrev)}  sub="no mês"/>
      <Stat rotulo="Custo previsto (mês)"valor={brl(custoPrev)}  sub="alimento"/>
      <Stat rotulo="Custo médio / refeição" valor={brl(medioRef)} sub="geral"/>
    </div>

    {totalReal>0 && (
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:12}}>
        <Stat rotulo="Refeições realizadas" valor={num(totalReal)} sub={(totalReal-totalPrev>=0?"+":"")+num(totalReal-totalPrev)+" vs previsto"}/>
        <Stat rotulo="Custo realizado"      valor={brl(custoReal)} sub="onde houve lançamento"/>
      </div>
    )}

    <SectionTitle>Custo médio por refeição</SectionTitle>
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH,overflowX:"auto"}}>
      <table style={{width:"100%",minWidth:440}}>
        <thead><tr style={{background:C.sage}}>
          <th style={{...cell,textAlign:"left",fontWeight:700}}>Refeição</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Previstas</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Custo médio</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Custo total</th>
        </tr></thead>
        <tbody>
          {Object.keys(porTipo).length===0 && <tr><td style={cell} colSpan={4}><span style={{color:C.muted}}>Sem refeições neste mês.</span></td></tr>}
          {Object.keys(porTipo).map(rid=>{ const t=porTipo[rid]; const med=t.prev>0?t.custoPrev/t.prev:0; return (
            <tr key={rid}>
              <td style={cell}>{nomeTipo(rid)}</td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{num(t.prev)}</td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>{brl(med)}</td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{brl(t.custoPrev)}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>

    <SectionTitle>Histórico de custo por refeição (12 semanas)</SectionTitle>
    <p style={{fontSize:13,color:C.muted,marginTop:-6}}>
      Custo médio por refeição, semana a semana (seg–dom). Barra cheia = <b style={{color:C.accent}}>realizado</b> (congelado no lançamento, custo real da época); barra clara = <b style={{color:C.brand2}}>previsto</b>.
    </p>
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,boxShadow:SH,padding:"16px 18px",overflowX:"auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:8,minWidth:560,height:170}}>
        {semanas.map((s,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{fontSize:10,color:C.muted,fontVariantNumeric:"tabular-nums"}}>{s.temReal?brl(s.realAvg):(s.prevAvg>0?brl(s.prevAvg):"")}</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:2,height:120}}>
              <div title="Previsto"  style={{width:9,height:Math.round((s.prevAvg/maxAvg)*120)+"px",background:C.wheatSoft,borderRadius:"3px 3px 0 0"}}/>
              <div title="Realizado" style={{width:9,height:Math.round((s.realAvg/maxAvg)*120)+"px",background:C.accent,  borderRadius:"3px 3px 0 0"}}/>
            </div>
            <div style={{fontSize:9,color:C.muted}}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>

    <SectionTitle>Menus agendados no mês</SectionTitle>
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH,overflowX:"auto"}}>
      <table style={{width:"100%",minWidth:560}}>
        <thead><tr style={{background:C.sage}}>
          <th style={{...cell,textAlign:"left",fontWeight:700}}>Data</th>
          <th style={{...cell,textAlign:"left",fontWeight:700}}>Refeição</th>
          <th style={{...cell,textAlign:"left",fontWeight:700}}>Prato principal</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Prev.</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Real.</th>
          <th style={{...cell,textAlign:"right",fontWeight:700}}>Custo</th>
        </tr></thead>
        <tbody>
          {linhasDia.length===0 && <tr><td style={cell} colSpan={6}><span style={{color:C.muted}}>Nenhum menu agendado.</span></td></tr>}
          {linhasDia.map((l,i)=>(
            <tr key={i}>
              <td style={cell}>{fmtData(l.dataISO)} <span style={{color:C.muted,fontSize:12}}>{NOMES3[wdDe(l.dataISO)]}</span></td>
              <td style={cell}>{nomeTipo(l.rid)}</td>
              <td style={cell}>{l.principal}</td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{num(l.prev)}</td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums",color:l.real==null?C.line:C.ink}}>{l.real==null?"—":num(l.real)}</td>
              <td style={{...cell,textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>{brl(l.custo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>);
}
