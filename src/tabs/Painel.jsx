import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH, SH2, CATEGORIAS, fatorUnidade, brl, num } from "../constants.js";
import { hojeISO, addDias, iso, fromISO, fmtData, NOMES3, wdDe, intervalo } from "../dates.js";
import { Stat } from "../ui.jsx";

const CORES_CAT = {
  "Prato principal": C.brand,
  "Guarnição":       C.brand2,
  "Acompanhamento":  C.accent,
  "Salada":          "#7CC24B",
  "Sobremesa":       C.wheat,
  "Bebida":          C.clay,
};
const corCat = (c) => CORES_CAT[c] || C.muted;

const segDe = (dataISO) => { const d=fromISO(dataISO); const off=(d.getDay()+6)%7; d.setDate(d.getDate()-off); return iso(d); };
const mesDe = (dataISO) => { const d=fromISO(dataISO); return { de: iso(new Date(d.getFullYear(),d.getMonth(),1)), ate: iso(new Date(d.getFullYear(),d.getMonth()+1,0)) }; };

// ---------------------------------------------------------------------------
// Donut SVG interativo
// ---------------------------------------------------------------------------
function Donut({dados, total}) {
  const [hover, setHover] = useState(null);
  const R = 70, CIRC = 2*Math.PI*R; let off = 0;
  const arcos = dados.filter(d=>d.valor>0).map(d=>{
    const len = (d.valor/total)*CIRC; const a = { ...d, len, off }; off += len; return a;
  });
  const sel = hover!=null ? arcos.find(a=>a.nome===hover) : null;
  return (
    <div style={{display:"flex",gap:18,alignItems:"center",flexWrap:"wrap"}}>
      <svg viewBox="0 0 200 200" style={{width:170,height:170,flex:"0 0 auto"}}>
        <circle cx="100" cy="100" r={R} fill="none" stroke={C.line} strokeWidth="24"/>
        {arcos.map(a=>(
          <circle key={a.nome} cx="100" cy="100" r={R} fill="none" stroke={corCat(a.nome)}
            strokeWidth={hover===a.nome?30:24}
            strokeDasharray={a.len+" "+(CIRC-a.len)} strokeDashoffset={-a.off}
            transform="rotate(-90 100 100)"
            onMouseEnter={()=>setHover(a.nome)} onMouseLeave={()=>setHover(null)}
            style={{cursor:"pointer",transition:"stroke-width .12s",opacity:hover&&hover!==a.nome?0.45:1}}/>
        ))}
        <text x="100" y="92" textAnchor="middle" style={{fontSize:11,fill:C.muted}}>{sel?sel.nome:"Total"}</text>
        <text x="100" y="114" textAnchor="middle" style={{fontSize:18,fontWeight:700,fill:C.ink,fontFamily:SERIF}}>{brl(sel?sel.valor:total)}</text>
        {sel && <text x="100" y="132" textAnchor="middle" style={{fontSize:11,fill:C.muted}}>{Math.round(sel.valor/total*100)}%</text>}
      </svg>
      <div style={{flex:"1 1 160px",display:"flex",flexDirection:"column",gap:5}}>
        {arcos.length===0 && <span style={{fontSize:13,color:C.muted}}>Sem custo no período.</span>}
        {arcos.map(a=>(
          <div key={a.nome} onMouseEnter={()=>setHover(a.nome)} onMouseLeave={()=>setHover(null)}
            style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",opacity:hover&&hover!==a.nome?0.5:1}}>
            <span style={{width:11,height:11,borderRadius:3,background:corCat(a.nome),flex:"0 0 auto"}}></span>
            <span style={{fontSize:12.5,color:C.ink,flex:"1 1 auto"}}>{a.nome}</span>
            <span style={{fontSize:12.5,fontWeight:600,color:C.ink,fontVariantNumeric:"tabular-nums"}}>{brl(a.valor)}</span>
            <span style={{fontSize:11,color:C.muted,width:34,textAlign:"right"}}>{Math.round(a.valor/total*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barras horizontais (ranking)
// ---------------------------------------------------------------------------
function Ranking({itens, fmtVal, cor}) {
  const max = Math.max(0.0001, ...itens.map(i=>i.valor));
  if (!itens.length) return <p style={{fontSize:13,color:C.muted}}>Sem dados no período.</p>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      {itens.map((it,k)=>(
        <div key={k} style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12.5,color:C.ink,width:"42%",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={it.nome}>{it.nome}</span>
          <div style={{flex:1,background:C.sage,borderRadius:6,height:16,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:Math.max(3,(it.valor/max)*100)+"%",background:cor||C.brand2,borderRadius:6,transition:"width .2s"}}></div>
          </div>
          <span style={{fontSize:12,fontWeight:600,color:C.ink,fontVariantNumeric:"tabular-nums",width:74,textAlign:"right"}}>{fmtVal(it.valor)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barras verticais de custo/dia com tooltip
// ---------------------------------------------------------------------------
function BarrasDia({dias}) {
  const [hov, setHov] = useState(null);
  const max = Math.max(0.0001, ...dias.map(d=>d.custo));
  if (!dias.length) return <p style={{fontSize:13,color:C.muted}}>Nenhum dia com cardápio no período.</p>;
  const larg = dias.length>20 ? 5 : (dias.length>10 ? 10 : 18);
  return (
    <div style={{position:"relative"}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:dias.length>20?2:5,height:150,overflowX:"auto",paddingTop:18}}>
        {dias.map((d,i)=>(
          <div key={d.dt} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
            style={{flex:"1 0 auto",minWidth:larg,display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
            <div style={{width:"100%",maxWidth:26,height:Math.round((d.custo/max)*110)+2+"px",
              background:hov===i?C.brand:C.brand2,borderRadius:"3px 3px 0 0",transition:"background .12s"}}></div>
            <span style={{fontSize:9,color:C.muted,whiteSpace:"nowrap"}}>{fromISO(d.dt).getDate()}</span>
          </div>
        ))}
      </div>
      {hov!=null && (
        <div style={{position:"absolute",top:0,left:0,background:C.ink,color:"#fff",fontSize:11.5,borderRadius:6,padding:"4px 8px",pointerEvents:"none",boxShadow:SH2,whiteSpace:"nowrap"}}>
          {fmtData(dias[hov].dt)} ({NOMES3[wdDe(dias[hov].dt)]}) · <b>{brl(dias[hov].custo)}</b>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel (exportado)
// ---------------------------------------------------------------------------
export function Painel({cardapio, pratoMap, insumoMap, custoPrato, custoPratosLista, tiposRefeicao, insumos}) {
  const hoje = hojeISO();
  const [preset, setPreset] = useState("mes");
  const m0 = mesDe(hoje);
  const [de,  setDe]  = useState(m0.de);
  const [ate, setAte] = useState(m0.ate);

  const aplicar = (p) => {
    setPreset(p);
    if (p==="semana") { const s=segDe(hoje); setDe(s); setAte(addDias(s,6)); }
    else if (p==="mes") { const mm=mesDe(hoje); setDe(mm.de); setAte(mm.ate); }
    else if (p==="30dias") { setDe(addDias(hoje,-29)); setAte(hoje); }
  };

  const ag = useMemo(()=>{
    const dias = intervalo(de, ate);
    let totalPrevRef=0, totalRealRef=0, custoPrev=0, custoReal=0, temReal=false;
    const porCat={}, porInsumo={}, freqPrato={}, porDia=[];
    dias.forEach(dt=>{
      const dia=cardapio[dt]; if(!dia) return;
      let teveDia=false, custoDia=0;
      tiposRefeicao.forEach(t=>{
        const m=dia[t.id]; if(!m||!m.pratos||!m.pratos.length) return;
        teveDia=true; const prev=m.previsto||0; totalPrevRef+=prev;
        m.pratos.forEach(id=>{
          const p=pratoMap[id]; if(!p) return;
          freqPrato[id]=(freqPrato[id]||0)+1;
          const cp=custoPrato(p);
          porCat[p.categoria]=(porCat[p.categoria]||0)+cp*prev;
          custoPrev+=cp*prev; custoDia+=cp*prev;
          (p.ficha||[]).forEach(l=>{ const ins=insumoMap[l.insumoId]; if(!ins) return;
            const c=((Number(l.g)||0)/fatorUnidade(ins.unidade))*ins.fc*ins.preco*prev;
            porInsumo[l.insumoId]=(porInsumo[l.insumoId]||0)+c; });
        });
        if(m.realizado!=null){ temReal=true; totalRealRef+=m.realizado; const pc=(m.custoCong!=null?m.custoCong:custoPratosLista(m.pratos)); custoReal+=pc*m.realizado; }
      });
      if(teveDia){ porDia.push({dt, custo:custoDia}); }
    });
    const cats = CATEGORIAS.map(c=>({nome:c, valor:porCat[c]||0})).filter(c=>c.valor>0);
    const topIns = Object.keys(porInsumo).map(id=>({nome:(insumoMap[id]&&insumoMap[id].nome)||id, valor:porInsumo[id]}))
      .sort((a,b)=>b.valor-a.valor).slice(0,8);
    const topPratos = Object.keys(freqPrato).map(id=>({nome:(pratoMap[id]&&pratoMap[id].nome)||id, valor:freqPrato[id]}))
      .sort((a,b)=>b.valor-a.valor).slice(0,8);
    return { totalPrevRef, totalRealRef, custoPrev, custoReal, temReal, cats, topIns, topPratos, porDia,
      diasComMenu:porDia.length, medio: totalPrevRef>0?custoPrev/totalPrevRef:0 };
  }, [cardapio, de, ate, tiposRefeicao, pratoMap, insumoMap]);

  const inp = {border:"1px solid "+C.line,borderRadius:8,padding:"7px 9px",fontSize:13,background:C.paper,color:C.ink};
  const chip = (id,label)=>(
    <button key={id} onClick={()=>aplicar(id)}
      style={{border:"1px solid "+(preset===id?C.brand:C.line),background:preset===id?C.brand:C.card,color:preset===id?"#fff":C.muted,
        borderRadius:20,padding:"7px 14px",fontSize:13,fontWeight:preset===id?700:500,cursor:"pointer"}}>{label}</button>
  );
  const Card = ({titulo, children, span}) => (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:14,boxShadow:SH,padding:"16px 18px",flex:span?"1 1 100%":"1 1 320px",minWidth:280}}>
      <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase",color:C.brand,fontWeight:700,marginBottom:12}}>{titulo}</div>
      {children}
    </div>
  );

  return (<>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:8}}>
      {chip("semana","Esta semana")}{chip("mes","Este mês")}{chip("30dias","Últimos 30 dias")}{chip("custom","Personalizado")}
      {preset==="custom" && (
        <span style={{display:"inline-flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <input type="date" value={de}  onChange={e=>setDe(e.target.value)}  style={inp}/>
          <span style={{fontSize:12,color:C.muted}}>até</span>
          <input type="date" value={ate} onChange={e=>setAte(e.target.value)} style={inp}/>
        </span>
      )}
      <span style={{marginLeft:"auto",fontSize:12.5,color:C.muted}}>{fmtData(de)} – {fmtData(ate)}</span>
    </div>

    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:16}}>
      <Stat rotulo="Dias com cardápio"     valor={num(ag.diasComMenu)}   sub="no período"/>
      <Stat rotulo="Refeições previstas"   valor={num(ag.totalPrevRef)}  sub="somadas"/>
      <Stat rotulo="Custo previsto"        valor={brl(ag.custoPrev)}     sub="alimento"/>
      <Stat rotulo="Custo médio / refeição" valor={brl(ag.medio)}        sub="geral"/>
      {ag.temReal && <Stat rotulo="Custo realizado" valor={brl(ag.custoReal)} sub={num(ag.totalRealRef)+" refeições"}/>}
    </div>

    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:14}}>
      <Card titulo="Custo por categoria">
        <Donut dados={ag.cats} total={ag.custoPrev||1}/>
      </Card>
      <Card titulo="Insumos que mais pesam (custo no período)">
        <Ranking itens={ag.topIns} fmtVal={brl} cor={C.brand}/>
      </Card>
    </div>

    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:14}}>
      <Card titulo="Custo previsto por dia" span>
        <BarrasDia dias={ag.porDia}/>
        <p style={{fontSize:11,color:C.muted,marginTop:8,marginBottom:0}}>Passe o mouse nas barras para ver a data e o valor.</p>
      </Card>
    </div>

    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:14,marginBottom:8}}>
      <Card titulo="Pratos mais usados (vezes no período)">
        <Ranking itens={ag.topPratos} fmtVal={(v)=>num(v)+"×"} cor={C.accent}/>
      </Card>
      <Card titulo="Previsto × Realizado">
        {!ag.temReal
          ? <p style={{fontSize:13,color:C.muted}}>Nenhum realizado lançado no período. Lance no Calendário para comparar.</p>
          : <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,marginBottom:4}}><span style={{color:C.muted}}>Refeições</span><span style={{color:C.ink}}><b>{num(ag.totalRealRef)}</b> real. / {num(ag.totalPrevRef)} prev.</span></div>
                {(()=>{ const mx=Math.max(1,ag.totalPrevRef,ag.totalRealRef); return (<>
                  <div style={{background:C.sage,borderRadius:6,height:13,overflow:"hidden",marginBottom:4}}><div style={{width:(ag.totalPrevRef/mx*100)+"%",height:"100%",background:C.brand2}}></div></div>
                  <div style={{background:C.sage,borderRadius:6,height:13,overflow:"hidden"}}><div style={{width:(ag.totalRealRef/mx*100)+"%",height:"100%",background:C.accent}}></div></div>
                </>); })()}
              </div>
              <div style={{fontSize:12.5,color:C.muted}}>Custo: <b style={{color:C.ink}}>{brl(ag.custoReal)}</b> realizado · {brl(ag.custoPrev)} previsto</div>
            </div>}
      </Card>
    </div>
  </>);
}
