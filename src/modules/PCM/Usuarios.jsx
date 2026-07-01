import React from "react";
const { useState } = React;
import { C, SH, SH2, SERIF } from "../../constants.js";
import { addUsuario, updateUsuario } from "./pcmdb.js";

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"9px 11px", fontSize:14, background:C.paper, color:C.ink };
const FUNCOES = ["Mecânico","Eletricista","Supervisor","Operador","Técnico","Auxiliar","Caldeireiro","Instrumentista"];

// ---------------------------------------------------------------------------
// Gestão de usuários (modal)
// ---------------------------------------------------------------------------
export function GerenciarUsuarios({ usuarios, recarregar, onFechar }) {
  const [nome,      setNome]    = useState("");
  const [funcao,    setFuncao]  = useState("");
  const [erro,      setErro]    = useState("");
  const [busy,      setBusy]    = useState(false);
  const [editId,    setEditId]  = useState(null);
  const [eNome,     setENome]   = useState("");
  const [eFuncao,   setEFuncao] = useState("");

  const adicionar = async () => {
    if (!nome.trim()) { setErro("Informe o nome."); return; }
    setErro(""); setBusy(true);
    try { await addUsuario({ nome:nome.trim(), funcao:funcao.trim()||null, ativo:true }); setNome(""); setFuncao(""); await recarregar(); }
    catch(e){ setErro(String(e.message||e)); }
    setBusy(false);
  };
  const abrirEdit = (u) => { setEditId(u.id); setENome(u.nome); setEFuncao(u.funcao||""); };
  const salvarEdit = async (u) => { if(!eNome.trim()) return; await updateUsuario(u.id,{ nome:eNome.trim(), funcao:eFuncao.trim()||null }); setEditId(null); await recarregar(); };
  const toggleAtivo = async (u) => { await updateUsuario(u.id,{ ativo:!u.ativo }); await recarregar(); };

  const lista = usuarios.slice().sort((a,b)=> (a.ativo===b.ativo? a.nome.localeCompare(b.nome) : (a.ativo?-1:1)));

  return (
    <div onClick={onFechar} style={{position:"fixed",inset:0,background:"rgba(28,42,54,.5)",zIndex:120,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:14,border:"1px solid "+C.line,boxShadow:SH2,width:"100%",maxWidth:520,padding:"20px 22px"}}>
        <div style={{fontFamily:SERIF,fontSize:18,color:C.brand,marginBottom:12}}>Usuários do PCM</div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:"2 1 150px"}}>
            <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:4}}>Nome</div>
            <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome do colaborador" style={{...inp,width:"100%"}}/>
          </div>
          <div style={{flex:"1 1 120px"}}>
            <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:4}}>Função</div>
            <input value={funcao} onChange={e=>setFuncao(e.target.value)} placeholder="ex.: Mecânico" list="pcm-funcoes" style={{...inp,width:"100%"}}/>
            <datalist id="pcm-funcoes">{FUNCOES.map(f=><option key={f} value={f}/>)}</datalist>
          </div>
          <button onClick={adicionar} disabled={busy} style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:busy?"default":"pointer",whiteSpace:"nowrap"}}>+ Adicionar</button>
        </div>
        {erro && <div style={{marginTop:10,fontSize:13,color:C.clay,background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:8,padding:"8px 10px"}}>{erro}</div>}

        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
          {lista.length===0 && <div style={{fontSize:13,color:C.muted}}>Nenhum usuário ainda. Adicione o primeiro acima.</div>}
          {lista.map(u=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,border:"1px solid "+C.line,borderRadius:10,padding:"8px 10px",opacity:u.ativo?1:0.55}}>
              {editId===u.id ? (
                <>
                  <input value={eNome} onChange={e=>setENome(e.target.value)} style={{...inp,flex:"2 1 0",padding:"6px 8px"}}/>
                  <input value={eFuncao} onChange={e=>setEFuncao(e.target.value)} list="pcm-funcoes" style={{...inp,flex:"1 1 0",padding:"6px 8px"}}/>
                  <button onClick={()=>salvarEdit(u)} style={{background:C.brand,color:"#fff",border:"none",borderRadius:7,padding:"6px 11px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Salvar</button>
                  <button onClick={()=>setEditId(null)} style={{background:"transparent",color:C.muted,border:"none",fontSize:12.5,cursor:"pointer"}}>cancelar</button>
                </>
              ) : (
                <>
                  <div style={{flex:"1 1 auto"}}>
                    <span style={{fontSize:14,color:C.ink,fontWeight:600}}>{u.nome}</span>
                    {u.funcao && <span style={{fontSize:12.5,color:C.muted,marginLeft:8}}>{u.funcao}</span>}
                    {!u.ativo && <span style={{fontSize:11,color:C.clay,marginLeft:8,fontWeight:700}}>inativo</span>}
                  </div>
                  <button onClick={()=>abrirEdit(u)} style={{background:"transparent",color:C.brand,border:"1px solid "+C.line,borderRadius:7,padding:"5px 10px",fontSize:12.5,cursor:"pointer"}}>Editar</button>
                  <button onClick={()=>toggleAtivo(u)} style={{background:"transparent",color:u.ativo?C.clay:C.green,border:"1px solid "+(u.ativo?C.clay:C.green),borderRadius:7,padding:"5px 10px",fontSize:12.5,cursor:"pointer"}}>{u.ativo?"Inativar":"Reativar"}</button>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{marginTop:18}}>
          <button onClick={onFechar} style={{background:"transparent",color:C.muted,border:"1px solid "+C.line,borderRadius:8,padding:"9px 16px",fontSize:13,cursor:"pointer"}}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela de seleção de usuário (login do módulo)
// ---------------------------------------------------------------------------
export function SelecaoUsuario({ usuarios, onEscolher, onSair, recarregar }) {
  const [gerenciar, setGerenciar] = useState(false);
  const ativos = usuarios.filter(u=>u.ativo);
  const logo = typeof window !== "undefined" ? window.LOGO : null;

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <header style={{background:"rgba(255,255,255,.9)",borderBottom:"1px solid "+C.line,boxShadow:SH}}>
        <div style={{maxWidth:1080,margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",gap:14}}>
          {logo && <img src={logo} alt="" style={{height:48,width:"auto"}}/>}
          <div style={{borderLeft:"1px solid "+C.line,paddingLeft:14}}>
            <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:C.accent,fontWeight:700}}>Sementes Veneza · Manutenção</div>
            <h1 style={{fontFamily:SERIF,fontSize:21,margin:"1px 0 0",fontWeight:600,color:C.brand}}>PCM</h1>
          </div>
          {onSair && <button onClick={onSair} style={{marginLeft:"auto",background:C.sage,color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"8px 13px",fontSize:13,fontWeight:600,cursor:"pointer"}}>← Módulos</button>}
        </div>
      </header>

      <main style={{maxWidth:760,margin:"0 auto",padding:"40px 20px",width:"100%"}}>
        <h2 style={{fontFamily:SERIF,fontSize:24,color:C.brand,margin:"0 0 4px"}}>Quem é você?</h2>
        <p style={{fontSize:14,color:C.muted,margin:"0 0 22px"}}>Escolha seu usuário para entrar no módulo de manutenção.</p>

        {ativos.length===0 ? (
          <div style={{background:C.card,border:"1px dashed "+C.brand2,borderRadius:12,padding:"24px",textAlign:"center"}}>
            <div style={{fontSize:14,color:C.muted,marginBottom:12}}>Nenhum usuário cadastrado ainda.</div>
            <button onClick={()=>setGerenciar(true)} style={{background:C.brand,color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cadastrar primeiro usuário</button>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
            {ativos.map(u=>(
              <button key={u.id} onClick={()=>onEscolher(u)}
                style={{textAlign:"left",background:C.card,border:"1px solid "+C.line,borderLeft:"4px solid "+C.brand,borderRadius:12,padding:"14px 16px",cursor:"pointer",boxShadow:SH}}>
                <div style={{fontSize:16,fontWeight:700,color:C.ink}}>{u.nome}</div>
                <div style={{fontSize:13,color:C.muted,marginTop:2}}>{u.funcao||"—"}</div>
              </button>
            ))}
          </div>
        )}

        <button onClick={()=>setGerenciar(true)} style={{marginTop:22,background:"transparent",color:C.brand,border:"1px solid "+C.line,borderRadius:8,padding:"9px 15px",fontSize:13.5,fontWeight:600,cursor:"pointer"}}>Gerenciar usuários</button>
      </main>

      {gerenciar && <GerenciarUsuarios usuarios={usuarios} recarregar={recarregar} onFechar={()=>setGerenciar(false)}/>}
    </div>
  );
}
