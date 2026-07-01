import React from "react";
const { useState } = React;
import { C, SH, SERIF, CATEGORIAS, brl, num } from "../constants.js";
import { NOMES, NOMES3, MESES, hojeISO, fromISO, iso, addDias, fmtData, fmtDataLonga, wdDe, pad } from "../dates.js";
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

  // ---- cardápio detalhado do mês (dia → refeição → pratos por categoria) ----
  const custoPorcao = (id) => custoPratosLista([id]);
  const dataBR = (dataISO) => { const dt=fromISO(dataISO); return pad(dt.getDate())+"/"+pad(dt.getMonth()+1)+"/"+dt.getFullYear(); };
  const diasDetalhe = [];
  for (let d=1; d<=dias; d++) {
    const dataISO = iso(new Date(ano,mes,d)); const dia = cardapio[dataISO]; if(!dia) continue;
    const refs = tiposRefeicao.filter(t=>dia[t.id]&&dia[t.id].pratos&&dia[t.id].pratos.length).map(t=>{
      const m = dia[t.id]; const porCat = {};
      m.pratos.forEach(id=>{ const p=pratoMap[id]; if(!p) return; (porCat[p.categoria]=porCat[p.categoria]||[]).push(p); });
      const percap = custoPratosLista(m.pratos);
      return { rid:t.id, nome:t.nome, previsto:m.previsto||0, realizado:m.realizado, porCat, percap };
    });
    if (refs.length) diasDetalhe.push({ dataISO, refs });
  }

  const baixarCSV = () => {
    const sep = ";";
    const esc = (v) => { const s = String(v==null?"":v); return /[";\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const dec = (n) => (Number(n)||0).toFixed(2).replace(".",",");
    const linhas = [["Data","Dia da semana","Refeição","Categoria","Prato","Custo/porção (R$)","Previstos","Realizados"]];
    diasDetalhe.forEach(({dataISO,refs})=>{
      const ds = NOMES[wdDe(dataISO)];
      refs.forEach(r=>{
        CATEGORIAS.filter(c=>r.porCat[c]).forEach(cat=>{
          r.porCat[cat].forEach(p=>{
            linhas.push([dataBR(dataISO), ds, r.nome, cat, p.nome, dec(custoPorcao(p.id)), r.previsto, r.realizado==null?"":r.realizado]);
          });
        });
      });
    });
    const csv = "﻿" + linhas.map(l=>l.map(esc).join(sep)).join("\r\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cardapio-"+MESES[mes].toLowerCase()+"-"+ano+".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  };

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

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginTop:30,marginBottom:14}}>
      <h2 style={{fontSize:13,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:C.brand,margin:0,display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:14,height:2,background:C.accent,borderRadius:2,display:"inline-block"}}></span>
        Cardápio detalhado do mês
      </h2>
      <button onClick={baixarCSV} disabled={!diasDetalhe.length}
        style={{background:diasDetalhe.length?C.brand:C.line,color:"#fff",border:"none",borderRadius:8,padding:"9px 15px",fontSize:13.5,fontWeight:600,cursor:diasDetalhe.length?"pointer":"default",display:"inline-flex",alignItems:"center",gap:7,whiteSpace:"nowrap"}}>
        <span aria-hidden>⬇</span> Baixar CSV (Excel)
      </button>
    </div>
    <p style={{fontSize:13,color:C.muted,marginTop:-6}}>Cada dia, suas refeições e todos os pratos que as compõem (com custo por porção). O CSV abre no Excel.</p>

    {diasDetalhe.length===0
      ? <p style={{fontSize:14,color:C.muted}}>Nenhum cardápio montado em {MESES[mes]}.</p>
      : <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:12}}>
          {diasDetalhe.map(({dataISO,refs})=>(
            <div key={dataISO} style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:SH}}>
              <div style={{background:C.sage,padding:"9px 14px",fontFamily:SERIF,fontSize:15.5,color:C.brand,borderBottom:"1px solid "+C.line}}>{fmtDataLonga(dataISO)}</div>
              <div style={{padding:"6px 14px 12px"}}>
                {refs.map(r=>(
                  <div key={r.rid} style={{marginTop:10}}>
                    <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.ink}}>{r.nome}</span>
                      <span style={{fontSize:12,color:C.muted}}>{num(r.previsto)} prev.{r.realizado!=null?" · "+num(r.realizado)+" real.":""} · {brl(r.percap)}/pessoa</span>
                    </div>
                    {CATEGORIAS.filter(c=>r.porCat[c]).map(cat=>(
                      <div key={cat} style={{marginBottom:3}}>
                        <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",color:C.muted,marginBottom:1}}>{cat}</div>
                        {r.porCat[cat].map(p=>(
                          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13.5,padding:"1px 0"}}>
                            <span>{p.nome}</span>
                            <span style={{fontSize:12,color:C.muted,fontVariantNumeric:"tabular-nums"}}>{brl(custoPorcao(p.id))}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>}
  </>);
}
