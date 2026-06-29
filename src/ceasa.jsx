import React from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf.min.mjs";
const { useState, useRef } = React;
import { C, SH, SH2, brl } from "./constants.js";
import { realce } from "./ui.jsx";

try {
  const __wb = (typeof window !== "undefined" && window.location && window.location.href) ? window.location.href : "";
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdf.worker.min.mjs", __wb).href;
} catch(e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.mjs";
}

// ---------------------------------------------------------------------------
// Utilitários de parsing do PDF
// ---------------------------------------------------------------------------

export function normNome(s) {
  return (s||"").toString().toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

const UNIDADES_CEASA = new Set(["CX","SC","MOL","MC","PE","PLT","UN","UNI","BD","BDJ","DZ","ENG","FD","PCT","PC","MAO","KG","SACO","SACA","MO","ENGRADADO"]);

export async function lerCeasaPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
  const itens = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc   = await page.getTextContent();
    const its  = tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({x:it.transform[4],y:it.transform[5],s:it.str.trim()}));
    its.sort((a,b)=>b.y-a.y);
    const grupos = []; let atual = null;
    its.forEach(it=>{
      if (atual && Math.abs(atual.y-it.y)<=3) { atual.itens.push(it); }
      else { atual={y:it.y,itens:[it]}; grupos.push(atual); }
    });
    grupos.forEach(g=>{
      const toks = g.itens.sort((a,b)=>a.x-b.x).map(t=>t.s).join(" ").split(/\s+/).filter(Boolean);
      if (toks.length < 5) return;
      if (!/^\d+$/.test(toks[0])) return;
      let embIdx = -1;
      for (let k=1; k<toks.length; k++) { if(/[A-Za-z]/.test(toks[k])) embIdx=k; }
      if (embIdx < 1) return;
      const preco = toks[toks.length-1].replace(".","").replace(",",".");
      const precoNum = parseFloat(preco);
      if (!isFinite(precoNum)||precoNum<=0) return;
      const nome = toks.slice(1,embIdx).join(" ");
      if (!nome || !/[A-Za-z]/.test(nome)) return;
      itens.push({nome, precokg:precoNum, emb:toks[embIdx]});
    });
  }
  const vistos = {}; const out = [];
  itens.forEach(it=>{ const k=normNome(it.nome); if(!vistos[k]){ vistos[k]=1; out.push(it); } });
  return out;
}

export function candidatosCeasa(insNome, lista) {
  const a = normNome(insNome); if (!a) return [];
  const pal = a.split(" ");
  const res = [];
  lista.forEach(it=>{
    const b = normNome(it.nome);
    let score = 0;
    if      (b===a)                          score=100;
    else if (b.startsWith(a))                score=80;
    else if (b.includes(a))                  score=60;
    else if (a.includes(b))                  score=50;
    else if (pal.every(p=>b.includes(p)))    score=40;
    if (score>0) res.push({...it, score, tam:b.length});
  });
  res.sort((x,y)=> y.score-x.score || x.tam-y.tam);
  return res;
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

export function PrecoCeasaCell({insumo, updateInsumo, ceasa, inp}) {
  const [aberto, setAberto] = useState(false);
  const itens = ceasa&&ceasa.itens ? ceasa.itens : null;
  const cands = itens ? candidatosCeasa(insumo.nome, itens).filter(c=>c.score>=50).slice(0,12) : [];
  return (
    <div style={{display:"inline-flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
      <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
        <span style={{color:C.muted}}>R$</span>
        <input type="number" step="0.1" min="0" value={insumo.preco}
          onChange={e=>updateInsumo(insumo.id,"preco",parseFloat(e.target.value)||0)}
          style={{...inp,width:74,textAlign:"right"}}/>
        <span style={{color:C.muted,fontSize:12}}>/{insumo.unidade||"kg"}</span>
        <button onClick={()=>setAberto(a=>!a)}
          title={itens?"Consultar preço no CEASA":"Suba o PDF do CEASA (seção abaixo)"}
          style={{border:"1px solid "+(itens?C.brand2:C.line),background:itens?C.sage:C.card,color:itens?C.brand:C.muted,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>
          CEASA
        </button>
      </div>
      {aberto && (
        <div style={{textAlign:"left",background:C.card,border:"1px solid "+C.line,borderRadius:10,boxShadow:SH2,padding:"8px 10px",width:250,maxWidth:"70vw"}}>
          {!itens
            ? <div style={{fontSize:12,color:C.muted}}>Suba o PDF do CEASA na seção "Atualizar preços pelo CEASA-GO", logo abaixo.</div>
            : cands.length===0
              ? <div style={{fontSize:12,color:C.muted}}>Nenhum item parecido com "{insumo.nome}" na cotação.</div>
              : <>
                  <div style={{fontSize:10.5,letterSpacing:.5,textTransform:"uppercase",color:C.muted,fontWeight:600,marginBottom:5}}>
                    CEASA · {ceasa.arquivo||"cotação"}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:200,overflowY:"auto"}}>
                    {cands.map((c,k)=>(
                      <button key={k} onClick={()=>{ updateInsumo(insumo.id,"preco",Number(c.precokg.toFixed(3))); setAberto(false); }}
                        style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",background:C.paper,border:"1px solid "+C.line,borderRadius:7,padding:"6px 9px",cursor:"pointer",fontSize:12.5,textAlign:"left"}}>
                        <span style={{color:C.ink}}>{c.nome}</span>
                        <b style={{color:C.brand,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{brl(c.precokg)}</b>
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:10.5,color:C.muted,marginTop:6}}>Clique pra usar, ou feche e digite na mão.</div>
                </>}
          <button onClick={()=>setAberto(false)}
            style={{marginTop:7,background:"transparent",border:"1px solid "+C.line,color:C.muted,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

export function AtualizarCeasa({insumos, updateInsumo, ceasa, setCeasa}) {
  const [depara,    setDepara]    = useState({});
  const [mostraLote,setMostraLote]= useState(false);
  const [carregando,setCarregando]= useState(false);
  const [erro,      setErro]      = useState("");
  const fileRef = useRef(null);
  const lista   = ceasa&&ceasa.itens ? ceasa.itens : null;
  const inp     = {border:"1px solid "+C.line,borderRadius:6,padding:"5px 7px",fontSize:13,background:C.paper,color:C.ink};

  const montaDepara = (its) => {
    const dp = {};
    insumos.forEach(i=>{ const cands=candidatosCeasa(i.nome,its); dp[i.id]={cands,escolhido:cands.length?cands[0].nome:"",on:cands.length>0}; });
    setDepara(dp);
  };

  const onArquivo = async (e) => {
    const f = e.target.files&&e.target.files[0]; if(!f) return;
    setErro(""); setCarregando(true);
    try {
      const buf = await f.arrayBuffer();
      const its = await lerCeasaPDF(buf);
      if (!its.length) throw new Error("Não encontrei a tabela de preços nesse PDF.");
      setCeasa({ itens:its, arquivo:f.name, quando:new Date().toISOString() });
      montaDepara(its); setMostraLote(true);
    } catch(err) { setErro(String((err&&err.message)||err)); }
    setCarregando(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const precoDe = (insId) => {
    const d = depara[insId]; if(!d||!d.escolhido||!lista) return null;
    const it = lista.find(x=>x.nome===d.escolhido); return it?it.precokg:null;
  };

  const aplicar = () => {
    insumos.forEach(i=>{ const d=depara[i.id]; if(d&&d.on){ const p=precoDe(i.id); if(p!=null) updateInsumo(i.id,"preco",Number(p.toFixed(3))); } });
    setMostraLote(false);
  };

  const comMatch = insumos.filter(i=>depara[i.id]&&depara[i.id].cands&&depara[i.id].cands.length);
  const semMatch = insumos.filter(i=>!(depara[i.id]&&depara[i.id].cands&&depara[i.id].cands.length));
  const nSel     = comMatch.filter(i=>depara[i.id]&&depara[i.id].on).length;

  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,boxShadow:SH,padding:"16px 18px",marginTop:18}}>
      <div style={{fontSize:15,fontWeight:700,color:C.brand}}>Atualizar preços pelo CEASA-GO</div>
      <p style={{fontSize:12.5,color:C.muted,margin:"4px 0 12px"}}>
        Baixe a cotação do dia no site do CEASA-GO (PDF) e suba aqui. Fica salvo: dá pra consultar pelo botão <b>CEASA</b> em cada insumo, ou atualizar tudo de uma vez. Os preços mudam todo dia — suba o PDF novo quando quiser.
      </p>

      {lista
        ? <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",background:C.sage,border:"1px solid "+C.line,borderRadius:10,padding:"10px 12px"}}>
            <span style={{fontSize:13,color:C.ink}}>✓ Cotação carregada: <b>{ceasa.arquivo||"PDF"}</b> · {lista.length} produtos</span>
            <button onClick={()=>{ montaDepara(lista); setMostraLote(true); }}
              style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"7px 13px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              Atualizar todos em lote
            </button>
            <label style={{background:C.card,border:"1px solid "+C.line,borderRadius:8,padding:"7px 13px",fontSize:13,cursor:"pointer",color:C.brand}}>
              Subir PDF novo<input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={onArquivo} style={{display:"none"}}/>
            </label>
            <button onClick={()=>setCeasa(null)} style={{background:"transparent",border:"none",color:C.muted,fontSize:12,cursor:"pointer",textDecoration:"underline"}}>remover</button>
            {carregando && <span style={{fontSize:13,color:C.brand}}>lendo PDF…</span>}
          </div>
        : <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={onArquivo} style={{fontSize:13}}/>
            {carregando && <span style={{fontSize:13,color:C.brand}}>lendo PDF…</span>}
          </div>}

      {erro && <div style={{marginTop:10,fontSize:13,color:C.clay,background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:8,padding:"8px 10px"}}>{erro}</div>}

      {lista && mostraLote && (
        <div style={{marginTop:14}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Confira os pares e marque o que atualizar:</div>
          <div style={{border:"1px solid "+C.line,borderRadius:10,overflow:"hidden",overflowX:"auto"}}>
            <table style={{width:"100%",minWidth:520,fontSize:13}}>
              <thead><tr style={{background:C.sage}}>
                <th style={{textAlign:"left",padding:"7px 9px"}}></th>
                <th style={{textAlign:"left",padding:"7px 9px"}}>Insumo</th>
                <th style={{textAlign:"left",padding:"7px 9px"}}>Produto no CEASA</th>
                <th style={{textAlign:"right",padding:"7px 9px"}}>Atual</th>
                <th style={{textAlign:"right",padding:"7px 9px"}}>CEASA/kg</th>
              </tr></thead>
              <tbody>
                {comMatch.map(i=>{ const d=depara[i.id]; const p=precoDe(i.id); const at=Number(i.preco)||0; return (
                  <tr key={i.id} style={{borderBottom:"1px solid "+C.line,opacity:d.on?1:0.5}}>
                    <td style={{padding:"6px 9px"}}>
                      <input type="checkbox" checked={d.on}
                        onChange={()=>setDepara(s=>({...s,[i.id]:{...s[i.id],on:!s[i.id].on}}))}
                        style={{accentColor:C.brand}}/>
                    </td>
                    <td style={{padding:"6px 9px",fontWeight:600}}>{i.nome}</td>
                    <td style={{padding:"6px 9px"}}>
                      <select value={d.escolhido}
                        onChange={e=>setDepara(s=>({...s,[i.id]:{...s[i.id],escolhido:e.target.value}}))}
                        style={{...inp,maxWidth:220}}>
                        {d.cands.map(c=><option key={c.nome} value={c.nome}>{c.nome} (R$ {c.precokg.toFixed(2)})</option>)}
                      </select>
                    </td>
                    <td style={{padding:"6px 9px",textAlign:"right",color:C.muted,fontVariantNumeric:"tabular-nums"}}>{brl(at)}</td>
                    <td style={{padding:"6px 9px",textAlign:"right",fontWeight:700,color:C.brand,fontVariantNumeric:"tabular-nums"}}>{p!=null?brl(p):"—"}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
          {semMatch.length>0 && <div style={{fontSize:12,color:C.muted,marginTop:8}}>Sem correspondência no CEASA (deixe na mão): {semMatch.map(i=>i.nome).join(", ")}</div>}
          <div style={{display:"flex",gap:10,marginTop:12,alignItems:"center"}}>
            <button onClick={aplicar} disabled={!nSel}
              style={{background:nSel?C.accent:C.line,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:14,fontWeight:600,cursor:nSel?"pointer":"default"}}>
              Aplicar {nSel>0?"("+nSel+")":""} preços
            </button>
            <button onClick={()=>setMostraLote(false)}
              style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"9px 14px",fontSize:13,cursor:"pointer"}}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RefCarnes() {
  const [res,       setRes]       = useState(null);
  const [carregando,setCarregando]= useState(false);
  const url  = (typeof window !== "undefined" && window.AI_PRICE_URL) || "";
  const anon = (typeof window !== "undefined" && window.SUPABASE_ANON) || "";
  const itens = [
    {nome:"boi gordo arroba atacado", unidade:"arroba", rotulo:"Boi gordo (@)"},
    {nome:"frango congelado",         unidade:"kg",     rotulo:"Frango (kg)"},
    {nome:"carne suína",              unidade:"kg",     rotulo:"Suína (kg)"},
  ];

  const buscar = async () => {
    if (!url) { setRes([{rotulo:"—", erro:"IA não configurada"}]); return; }
    setCarregando(true); setRes(null);
    const out = [];
    for (const it of itens) {
      try {
        const r = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+anon,"apikey":anon},body:JSON.stringify({nome:it.nome,unidade:it.unidade,regiao:"Goiás"})});
        const d = await r.json();
        if (!r.ok||d.erro||typeof d.preco==="undefined") throw new Error(d.erro||("erro "+r.status));
        out.push({rotulo:it.rotulo, preco:Number(d.preco)||0, fonte:d.fonte||"", obs:d.obs||""});
      } catch(e) { out.push({rotulo:it.rotulo, erro:String((e&&e.message)||e).slice(0,60)}); }
      setRes([...out]);
    }
    setCarregando(false);
  };

  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,boxShadow:SH,padding:"16px 18px",marginTop:14}}>
      <div style={{fontSize:15,fontWeight:700,color:C.brand}}>Referência de carnes (IA)</div>
      <p style={{fontSize:12.5,color:C.muted,margin:"4px 0 12px"}}>
        O CEASA não cota corte de carne. Aqui a IA busca uma <b>referência de mercado</b> (boi, frango, suíno) só pra ter uma base — confirme com seu fornecedor.
      </p>
      <button onClick={buscar} disabled={carregando}
        style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:14,fontWeight:600,cursor:carregando?"default":"pointer"}}>
        {carregando?"buscando…":"Buscar referências"}
      </button>
      {res && (
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
          {res.map((r,k)=>(
            <div key={k} style={{flex:"1 1 160px",border:"1px solid "+C.line,borderRadius:10,padding:"10px 12px",background:C.paper}}>
              <div style={{fontSize:11,letterSpacing:.5,textTransform:"uppercase",color:C.muted,fontWeight:600}}>{r.rotulo}</div>
              {r.erro
                ? <div style={{fontSize:12,color:C.clay,marginTop:3}}>{r.erro}</div>
                : <>
                    <div style={{fontSize:20,fontWeight:700,color:C.ink,marginTop:2}}>{brl(r.preco)}</div>
                    {r.fonte && <div style={{fontSize:10,color:C.muted}}>{r.fonte}</div>}
                  </>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConsultaCeasa({ceasa}) {
  const [q, setQ] = useState("");
  const itens = ceasa&&ceasa.itens ? ceasa.itens : null;
  const lista  = itens ? itens.filter(it=>!q||normNome(it.nome).includes(normNome(q))).slice().sort((a,b)=>a.nome.localeCompare(b.nome)) : [];
  const qReal = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();
  const inp  = {border:"1px solid "+C.line,borderRadius:8,padding:"8px 11px",fontSize:14,background:C.paper,color:C.ink};
  const cell = {padding:"7px 11px",borderBottom:"1px solid "+C.line,fontSize:13.5};
  return (<>
    {!itens
      ? <p style={{fontSize:13.5,color:C.muted}}>Nenhuma cotação carregada. Vá em <b>Insumos &amp; preços</b> e suba o PDF do CEASA na seção "Atualizar preços pelo CEASA-GO". Depois a lista completa aparece aqui.</p>
      : <>
          <p style={{fontSize:13,color:C.muted,marginTop:-6}}>Cotação <b>{ceasa.arquivo||"carregada"}</b> · {itens.length} produtos. Preço por quilo (coluna oficial do CEASA). Só consulta — não altera nada.</p>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar produto (ex.: tomate, banana, ovo)…"
            style={{...inp,width:"100%",maxWidth:360,marginBottom:12}}/>
          <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:12,boxShadow:SH,overflow:"hidden",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{width:"100%",minWidth:360}}>
              <thead><tr style={{background:C.sage}}>
                <th style={{...cell,textAlign:"left",fontWeight:700}}>Produto</th>
                <th style={{...cell,textAlign:"center",fontWeight:700,width:70}}>Emb.</th>
                <th style={{...cell,textAlign:"right",fontWeight:700,width:110}}>Preço/kg</th>
              </tr></thead>
              <tbody>
                {lista.map((it,k)=>(
                  <tr key={k}>
                    <td style={{...cell,textAlign:"left"}}>{realce(it.nome, qReal)}</td>
                    <td style={{...cell,textAlign:"center",color:C.muted}}>{it.emb||"—"}</td>
                    <td style={{...cell,textAlign:"right",fontWeight:700,color:C.brand,fontVariantNumeric:"tabular-nums"}}>{brl(it.precokg)}</td>
                  </tr>
                ))}
                {lista.length===0 && <tr><td colSpan={3} style={{...cell,textAlign:"center",color:C.muted}}>Nenhum produto com "{q}".</td></tr>}
              </tbody>
            </table>
          </div>
        </>}
  </>);
}
