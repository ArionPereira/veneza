import React from "react";
const { useState, useEffect, useCallback } = React;
import { C, SH } from "../../constants.js";
import { Header, Centro } from "../../ui.jsx";
import { sb } from "../../db.js";

export const S = {
  card:{background:C.card,border:"1px solid "+C.line,borderRadius:14,padding:16,boxShadow:SH},
  input:{padding:"9px 10px",border:"1px solid "+C.line,borderRadius:8,background:C.paper,color:C.ink,minWidth:130,maxWidth:"100%"},
  btn:{padding:"9px 14px",border:0,borderRadius:8,background:C.brand,color:"#fff",fontWeight:700,cursor:"pointer"},
  btn2:{padding:"8px 12px",border:"1px solid "+C.line,borderRadius:8,background:C.sage,color:C.brand,fontWeight:700,cursor:"pointer"},
  danger:{padding:"8px 12px",border:0,borderRadius:8,background:C.clay,color:"#fff",fontWeight:700,cursor:"pointer"},
  th:{padding:"9px 10px",textAlign:"left",fontSize:11,textTransform:"uppercase",color:C.muted,borderBottom:"1px solid "+C.line,whiteSpace:"nowrap"},
  td:{padding:"9px 10px",fontSize:13,borderBottom:"1px solid "+C.line,verticalAlign:"top"},
};
export const hoje=()=>new Date().toISOString().slice(0,10);
export const num=n=>Number(n||0).toLocaleString("pt-BR",{maximumFractionDigits:3});
export const ok=async p=>{const {data,error}=await p;if(error)throw error;return data};
export const listar=(t,ordem="criado_em")=>ok(sb.from(t).select("*").order(ordem,{ascending:false}));
export const inserir=(t,v)=>ok(sb.from(t).insert(v).select().single());
export const atualizar=(t,id,v)=>ok(sb.from(t).update(v).eq("id",id).select().single());
export const remover=(t,id)=>ok(sb.from(t).delete().eq("id",id));
export const rpc=(nome,args)=>ok(sb.rpc(nome,args));
// traduz erros do Supabase/Postgres em mensagens que o usuário entende
export const msgErro=(e)=>{
  const code=(e&&e.code)||"";
  const raw=((e&&e.message)||String(e||""))+" "+((e&&e.details)||"");
  if(code==="23505"||/duplicate key|already exists|unique/i.test(raw)){
    if(/\bdata\b|leitura/i.test(raw)) return "Já existe um lançamento para esse ponto nessa data. Para corrigir, clique na linha do histórico e edite o registro em vez de criar outro.";
    return "Já existe um registro com esses dados (valor duplicado).";
  }
  if(code==="23503"||/foreign key/i.test(raw)) return "Este item está vinculado a outros lançamentos e não pode ser removido. Remova os lançamentos ligados a ele primeiro.";
  if(code==="23502"||/null value|not-null/i.test(raw)) return "Preencha todos os campos obrigatórios antes de salvar.";
  if(code==="23514"||/check constraint/i.test(raw)) return "Algum valor está fora do permitido. Confira os números informados.";
  if(code==="PGRST116"||/0 rows/i.test(raw)) return "Registro não encontrado — talvez já tenha sido removido. Atualize a página.";
  if(code==="42501"||/permission denied|not authorized|row-level security|JWT/i.test(raw)) return "Você não tem permissão para essa ação.";
  if(/Failed to fetch|NetworkError|network|Load failed/i.test(raw)) return "Sem conexão com o servidor. Verifique a internet e tente novamente.";
  return (e&&e.message)||"Não foi possível concluir a operação. Tente novamente.";
};
export const csv=(nome,rows)=>{
  const esc=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
  const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(esc).join(";")).join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=nome;a.click();URL.revokeObjectURL(a.href);
};
export function Campo({label,children,wide=false}){return <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,color:C.muted,flex:wide?"1 1 260px":undefined}}>{label}{children}</label>}
export function Tabela({cols,rows,vazio="Nenhum registro.",onRow}){return <div style={{overflow:"auto",...S.card,padding:0}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}><thead><tr>{cols.map(c=><th key={c[0]} style={S.th}>{c[1]}</th>)}</tr></thead><tbody>{!rows.length&&<tr><td colSpan={cols.length} style={S.td}>{vazio}</td></tr>}{rows.map((r,i)=><tr key={r.id||i} onClick={onRow?()=>onRow(r):undefined} style={{cursor:onRow?"pointer":"default"}}>{cols.map(c=><td key={c[0]} style={S.td}>{c[2]?c[2](r):r[c[0]]}</td>)}</tr>)}</tbody></table></div>}
export function Form({children,onSubmit,label="Salvar"}){return <form onSubmit={e=>{e.preventDefault();onSubmit(new FormData(e.currentTarget),e.currentTarget)}} style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"end"}}>{children}<button style={S.btn}>{label}</button></form>}
export function Erro({msg}){return msg&&<div style={{padding:10,background:"#FBEAE3",color:C.clay,border:"1px solid "+C.clay,borderRadius:9,marginBottom:12}}>Erro: {msg}</div>}
export function Aviso({children}){return <div style={{padding:10,background:C.sage,color:C.brand,border:"1px solid "+C.line,borderRadius:9,marginBottom:12}}>{children}</div>}
export function Titulo({children,acao}){return <div style={{display:"flex",alignItems:"center",gap:10,margin:"28px 0 12px"}}><h2 style={{fontSize:13,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:C.brand,margin:0,flex:1}}>{children}</h2>{acao}</div>}
export function BtnMini({onClick,children,cor}){return <button type="button" onClick={onClick} style={{padding:"4px 9px",border:"1px solid "+(cor||C.line),borderRadius:7,background:"transparent",color:cor||C.brand,fontSize:12,fontWeight:600,cursor:"pointer",marginRight:6,whiteSpace:"nowrap"}}>{children}</button>}
export const cancelBadge = <span style={{color:C.clay,fontWeight:700,fontSize:12}}>Cancelado</span>;
export function Modal({titulo,onFechar,children}){
  return <div onClick={onFechar} style={{position:"fixed",inset:0,background:"rgba(28,42,54,.5)",zIndex:100,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 16px",overflowY:"auto"}}>
    <div onClick={e=>e.stopPropagation()} style={{...S.card,width:"100%",maxWidth:460}}>
      {titulo&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><b style={{color:C.brand,fontSize:16}}>{titulo}</b><span onClick={onFechar} style={{...S.btn2,cursor:"pointer"}}>Fechar</span></div>}
      {children}
    </div>
  </div>;
}
export function Auditoria({rows}){
  return <Tabela rows={rows} vazio="Nenhuma alteração registrada." cols={[
    ["criado_em","Quando",x=>new Date(x.criado_em).toLocaleString("pt-BR")],
    ["usuario_nome","Usuário",x=>x.usuario_nome||"—"],
    ["entidade","Item"],
    ["acao","Ação",x=>({editar:"Editou",cancelar:"Cancelou",ativar:"Ativou",inativar:"Inativou"}[x.acao]||x.acao)],
    ["resumo","Detalhe"],
  ]}/>;
}
export function useDados(tabelas,prefixo){
  const [dados,setDados]=useState({}),[loading,setLoading]=useState(true),[erro,setErro]=useState("");
  const recarregar=useCallback(async()=>{try{const vals=await Promise.all(tabelas.map(t=>listar(t)));setDados(Object.fromEntries(tabelas.map((t,i)=>[t,vals[i]||[]])));setErro("")}catch(e){setErro(msgErro(e))}finally{setLoading(false)}},[tabelas.join("|")]);
  useEffect(()=>{recarregar();const ch=sb.channel(prefixo+"-realtime");tabelas.forEach(t=>ch.on("postgres_changes",{event:"*",schema:"public",table:t},recarregar));ch.subscribe();return()=>{try{sb.removeChannel(ch)}catch(e){}}},[recarregar]);
  return {dados,loading,erro,recarregar,setErro};
}
export function Shell({titulo,eyebrow,tabs,tab,setTab,onSair,loading,children}) {
  if(loading)return <Centro txt={"Carregando "+titulo.toLowerCase()+"…"}/>;
  return <div style={{minHeight:"100vh",paddingBottom:60}}><Header titulo={titulo} eyebrow={eyebrow} tabs={tabs} tab={tab} setTab={setTab} onSair={onSair}/><main style={{maxWidth:1080,margin:"0 auto",padding:"0 20px"}}>{children}</main></div>;
}
