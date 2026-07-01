import React from "react";
import { C, SERIF, SH } from "./constants.js";

export const MODULOS = [
  { id:"restaurante", nome:"Restaurante", icone:"🍽️", descricao:"Cardápio, fichas técnicas, custos, operação e relatórios do refeitório.", ativo:true },
  { id:"pcm", nome:"PCM — Manutenção", icone:"🛠️", descricao:"Equipamentos, ordens de serviço e histórico de manutenção da UBS.", ativo:true },
  { id:"pluviometria", nome:"Pluviometria e Hidrômetro", icone:"🌧️", descricao:"Leituras de chuva (mm) e de hidrômetro (m³), consumo de água, acumulados e relatórios.", ativo:true },
  { id:"abastecimento", nome:"Abastecimento", icone:"⛽", descricao:"Frota, tanques, abastecimentos, consumo e custos de combustível.", ativo:true },
  { id:"almoxarifado", nome:"Estoque e Almoxarifado", icone:"📦", descricao:"Itens, entradas, saídas, inventários e controle de estoque mínimo.", ativo:true },
];

function Card({mod,onSelect}) {
  return <button onClick={()=>onSelect(mod.id)} style={{textAlign:"left",background:C.card,border:"1px solid "+C.line,borderRadius:16,padding:"22px 22px 20px",boxShadow:SH,cursor:"pointer",borderLeft:"4px solid "+C.brand,display:"flex",flexDirection:"column",gap:10,minHeight:168}}>
    <div style={{fontSize:34,lineHeight:1}}>{mod.icone}</div>
    <h2 style={{fontFamily:SERIF,fontSize:20,margin:0,color:C.brand,fontWeight:600}}>{mod.nome}</h2>
    <p style={{fontSize:13.5,color:C.muted,margin:0,lineHeight:1.45,flex:1}}>{mod.descricao}</p>
    <span style={{marginTop:4,fontSize:13,fontWeight:700,color:C.brand}}>Acessar →</span>
  </button>;
}

export function Hub({onSelect,nome}) {
  const logo=typeof window!=="undefined"?window.LOGO:null;
  React.useEffect(()=>{document.title="Sementes Veneza"},[]);
  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
    <header style={{background:"rgba(255,255,255,.9)",backdropFilter:"saturate(180%) blur(8px)",borderBottom:"1px solid "+C.line,boxShadow:SH}}>
      <div style={{maxWidth:1080,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        {logo&&<img src={logo} alt="Sementes Veneza" style={{height:80,width:"auto"}}/>}
        <div style={{borderLeft:"1px solid "+C.line,paddingLeft:14}}><div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:C.accent,fontWeight:700}}>Sementes Veneza</div><h1 style={{fontFamily:SERIF,fontSize:21,margin:"1px 0 0",fontWeight:600,color:C.brand}}>Central de aplicativos</h1></div>
        {nome&&<span style={{marginLeft:"auto",fontSize:13,color:C.muted}}>Olá, <strong style={{color:C.ink}}>{nome}</strong></span>}
      </div>
    </header>
    <main style={{maxWidth:1080,margin:"0 auto",padding:"36px 20px 48px",width:"100%"}}>
      <p style={{fontSize:15,color:C.muted,margin:"0 0 26px"}}>Escolha um módulo para começar.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:18}}>{MODULOS.map(m=><Card key={m.id} mod={m} onSelect={onSelect}/>)}</div>
    </main>
  </div>;
}
