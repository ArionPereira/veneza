import React from "react";
const { useState, useEffect } = React;
import { C, SERIF, SH, brl } from "./constants.js";

// Realça (negrito + fundo) o trecho de `texto` que casa com a busca `q`
// (q já normalizada: minúscula, sem acento). Mapeia índices do texto
// normalizado de volta para o original para destacar a posição certa.
export function realce(texto, q) {
  const orig = (texto==null?"":texto).toString();
  if (!q) return orig;
  const map = []; let norm = "";
  for (let i=0;i<orig.length;i++){
    const n = orig[i].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
    for (let j=0;j<n.length;j++) map.push(i);
    norm += n;
  }
  const idx = norm.indexOf(q);
  if (idx < 0) return orig;
  const ini = map[idx];
  const fim = (map[idx+q.length-1] ?? orig.length-1) + 1;
  return (<>{orig.slice(0,ini)}<mark style={{background:"#FBEFC9",color:C.ink,borderRadius:3,padding:"0 1px",fontWeight:600}}>{orig.slice(ini,fim)}</mark>{orig.slice(fim)}</>);
}

export function ModalNome({onOk, onVoltar}) {
  const [v, setV] = useState("");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(35,41,31,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,borderRadius:14,padding:"26px 24px",maxWidth:380,width:"100%",border:"1px solid "+C.line}}>
        <h2 style={{fontFamily:SERIF,color:C.pine,margin:"0 0 6px"}}>Quem é você?</h2>
        <p style={{fontSize:13,color:C.muted,marginTop:0}}>Informe seu nome para acessar o módulo.</p>
        <input autoFocus value={v} onChange={e=>setV(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&v.trim()) onOk(v.trim()); }}
          placeholder="Ex.: Arion"
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid "+C.line,fontSize:15,background:C.paper,color:C.ink}}/>
        <button onClick={()=>{ if(v.trim()) onOk(v.trim()); }}
          style={{marginTop:14,width:"100%",background:C.pine,color:"#fff",border:"none",borderRadius:8,padding:"11px",fontSize:15,fontWeight:600,cursor:"pointer"}}>
          Entrar
        </button>
        {onVoltar && (
          <button onClick={onVoltar}
            style={{marginTop:8,width:"100%",background:"transparent",color:C.muted,border:"none",borderRadius:8,padding:"8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            ← Voltar aos módulos
          </button>
        )}
      </div>
    </div>
  );
}

export function Centro({txt}) {
  return <div style={{maxWidth:1080,margin:"80px auto",textAlign:"center",color:C.muted}}>{txt}</div>;
}

export function BarraPresenca({online, nome, ultimoSave, status, pendente, onSync}) {
  const unicos = []; online.forEach(n=>{ if(unicos.indexOf(n)<0) unicos.push(n); });
  if (unicos.indexOf(nome) < 0) unicos.unshift(nome);
  const txt = unicos.map(n => n===nome ? n+" (você)" : n).join(", ");
  return (
    <div className="no-print" style={{background:C.green,color:"#fff",fontSize:13}}>
      <div style={{maxWidth:1080,margin:"0 auto",padding:"7px 20px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"#5DD68B",display:"inline-block"}}></span>
          Online: {txt||"—"}
        </span>
        <span style={{opacity:.85}}>Último save: {ultimoSave||"—"}</span>
        <span style={{marginLeft:"auto",opacity:.95}}>{status}</span>
        {pendente && (
          <button onClick={onSync}
            style={{background:"#fff",color:C.green,border:"none",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            ↻ Sincronizar novas alterações
          </button>
        )}
      </div>
    </div>
  );
}

export function Header({tab, setTab, onSair, titulo="Restaurante", eyebrow="Sementes Veneza · Refeitório"}) {
  const tabs = [["cardapio","Calendário"],["custos","Fichas & custos"],["operacao","Operação"],["painel","Painel"],["relatorio","Relatório"],["mural","Mural"]];
  const logo = typeof window !== "undefined" ? window.LOGO : null;
  const [isMobile, setIsMobile] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(()=>{
    if (typeof window==="undefined"||!window.matchMedia) return;
    const mq = window.matchMedia("(max-width:640px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    if (mq.addEventListener) { mq.addEventListener("change",upd); return ()=>mq.removeEventListener("change",upd); }
    mq.addListener(upd); return ()=>mq.removeListener(upd);
  },[]);

  const tabAtual = (tabs.find(([id])=>id===tab)||[])[1];
  const irPara = (id) => { setTab(id); setMenuAberto(false); };
  const logoImg = logo && <img onClick={onSair?()=>onSair():undefined} title={onSair?"Voltar à central de aplicativos":undefined}
    src={logo} alt="Sementes Veneza" style={{height:isMobile?48:62,width:"auto",cursor:onSair?"pointer":"default"}}/>;

  return (<>
    <header className="no-print" style={{background:"rgba(255,255,255,.9)",backdropFilter:"saturate(180%) blur(8px)",WebkitBackdropFilter:"saturate(180%) blur(8px)",borderBottom:"1px solid "+C.line,boxShadow:SH,marginBottom:28,position:"sticky",top:0,zIndex:50}}>
      <div style={{maxWidth:1080,margin:"0 auto",padding:"0 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",padding:"12px 0 10px"}}>
          {logoImg}
          <div style={{borderLeft:"1px solid "+C.line,paddingLeft:14}}>
            <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:C.accent,fontWeight:700}}>{eyebrow}</div>
            <h1 style={{fontFamily:SERIF,fontSize:21,margin:"1px 0 0",fontWeight:600,color:C.brand,letterSpacing:-0.3}}>{titulo}</h1>
          </div>
          {isMobile
            ? <button onClick={()=>setMenuAberto(true)} aria-label="Abrir menu" title="Abrir menu"
                style={{marginLeft:"auto",background:C.sage,color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"8px 12px",fontSize:18,lineHeight:1,cursor:"pointer"}}>☰</button>
            : (onSair && (
                <button onClick={onSair} title="Voltar à central de aplicativos"
                  style={{marginLeft:"auto",background:C.sage,color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"8px 13px",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                  <span aria-hidden>←</span> Módulos
                </button>
              ))}
        </div>
        {!isMobile && (
          <nav style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {tabs.map(([id,label])=>{
              const a = tab===id;
              return (
                <button key={id} onClick={()=>setTab(id)}
                  style={{border:"none",cursor:"pointer",fontSize:13.5,fontWeight:a?700:500,padding:"11px 15px",background:"transparent",color:a?C.brand:C.muted,borderBottom:"2.5px solid "+(a?C.brand:"transparent"),marginBottom:-1,transition:"color .15s"}}>
                  {label}
                </button>
              );
            })}
          </nav>
        )}
        {isMobile && (
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 0 8px",fontSize:13,color:C.muted}}>
            <span style={{fontWeight:700,color:C.brand}}>{tabAtual}</span>
          </div>
        )}
      </div>
    </header>

    {isMobile && menuAberto && (
      <div className="no-print">
        <div onClick={()=>setMenuAberto(false)} style={{position:"fixed",inset:0,background:"rgba(28,42,54,.45)",zIndex:60}}/>
        <div style={{position:"fixed",top:0,right:0,bottom:0,width:"80%",maxWidth:300,background:C.card,zIndex:61,boxShadow:"-6px 0 22px rgba(16,42,67,.18)",padding:"16px 14px",display:"flex",flexDirection:"column",gap:4,overflowY:"auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:11,letterSpacing:1.5,textTransform:"uppercase",color:C.accent,fontWeight:700}}>Menu</span>
            <button onClick={()=>setMenuAberto(false)} aria-label="Fechar menu"
              style={{background:"transparent",border:"none",color:C.muted,fontSize:22,lineHeight:1,cursor:"pointer",padding:"0 4px"}}>&times;</button>
          </div>
          {tabs.map(([id,label])=>{
            const a = tab===id;
            return (
              <button key={id} onClick={()=>irPara(id)}
                style={{textAlign:"left",border:"none",cursor:"pointer",fontSize:15,fontWeight:a?700:500,padding:"13px 12px",borderRadius:9,background:a?C.sage:"transparent",color:a?C.brand:C.ink}}>
                {label}
              </button>
            );
          })}
          {onSair && (
            <button onClick={()=>{ setMenuAberto(false); onSair(); }}
              style={{textAlign:"left",marginTop:8,borderTop:"1px solid "+C.line,paddingTop:14,border:"none",background:"transparent",color:C.brand,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              ← Voltar aos módulos
            </button>
          )}
        </div>
      </div>
    )}
  </>);
}

export function Stat({rotulo, valor, sub}) {
  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:14,padding:"15px 18px",flex:"1 1 160px",boxShadow:SH,borderLeft:"3px solid "+C.brand}}>
      <div style={{fontSize:10.5,letterSpacing:1.2,textTransform:"uppercase",color:C.muted,fontWeight:600}}>{rotulo}</div>
      <div style={{fontSize:27,fontWeight:700,color:C.ink,fontVariantNumeric:"tabular-nums",marginTop:4,letterSpacing:-0.5}}>{valor}</div>
      {sub && <div style={{fontSize:12,color:C.muted,marginTop:2}}>{sub}</div>}
    </div>
  );
}

export function SectionTitle({children}) {
  return (
    <h2 style={{fontSize:13,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:C.brand,margin:"30px 0 14px",display:"flex",alignItems:"center",gap:8}}>
      <span style={{width:14,height:2,background:C.accent,borderRadius:2,display:"inline-block"}}></span>
      {children}
    </h2>
  );
}
