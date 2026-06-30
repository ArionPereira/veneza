import React from "react";
const { useState, useEffect, useRef, useCallback } = React;
import { C } from "../../constants.js";
import { Header, Centro } from "../../ui.jsx";
import { listUsuarios, listSetores, listEquipamentos, listOrdens, assinarPCM } from "./pcmdb.js";
import { SelecaoUsuario } from "./Usuarios.jsx";
import { Equipamentos } from "./Equipamentos.jsx";
import { Ordens } from "./Ordens.jsx";

const TABS = [["ordens","Ordens"],["equipamentos","Equipamentos"]];
const CHAVE_USUARIO = "pcm_usuario_id";

export function PCM({ onSair }) {
  const [usuarios,     setUsuarios]     = useState([]);
  const [setores,      setSetores]      = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [ordens,       setOrdens]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [erro,         setErro]         = useState(null);
  const [tab,          setTab]          = useState("ordens");
  const [usuarioId,    setUsuarioId]    = useState(()=>{ try { return localStorage.getItem(CHAVE_USUARIO) || null; } catch(e){ return null; } });

  const usuario = usuarios.find(u=>u.id===usuarioId && u.ativo) || null;
  const escolherUsuario = (u) => { try { localStorage.setItem(CHAVE_USUARIO, u.id); } catch(e){} setUsuarioId(u.id); };
  const trocarUsuario   = () => { try { localStorage.removeItem(CHAVE_USUARIO); } catch(e){} setUsuarioId(null); };

  const recarregar = useCallback(async () => {
    try {
      const [u, s, e, o] = await Promise.all([listUsuarios(), listSetores(), listEquipamentos(), listOrdens()]);
      setUsuarios(u||[]); setSetores(s||[]); setEquipamentos(e||[]); setOrdens(o||[]); setErro(null);
    } catch (err) { setErro(err.message || String(err)); }
  }, []);

  useEffect(()=>{ document.title = "PCM · Sementes Veneza"; return ()=>{ document.title = "Sementes Veneza"; }; }, []);
  useEffect(()=>{ (async ()=>{ await recarregar(); setLoading(false); })(); }, [recarregar]);

  const tmr = useRef(null);
  useEffect(()=>{
    const desassinar = assinarPCM(()=>{
      if (tmr.current) clearTimeout(tmr.current);
      tmr.current = setTimeout(recarregar, 300);
    });
    return ()=>{ if (tmr.current) clearTimeout(tmr.current); desassinar(); };
  }, [recarregar]);

  if (loading) return <Centro txt="Carregando manutenção…"/>;

  // Gate: só usuários cadastrados entram (login do módulo)
  if (!usuario) return <SelecaoUsuario usuarios={usuarios} onEscolher={escolherUsuario} onSair={onSair} recarregar={recarregar}/>;

  return (
    <div style={{minHeight:"100vh",paddingBottom:64}}>
      <Header tab={tab} setTab={setTab} onSair={onSair}
        titulo="PCM" eyebrow="Sementes Veneza · Manutenção" tabs={TABS}
        usuario={usuario.nome} onTrocarUsuario={trocarUsuario}/>

      {erro && <div style={{maxWidth:1080,margin:"0 auto 12px",padding:"10px 14px",background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:10,color:C.clay,fontSize:13}}>Erro: {erro}</div>}

      <main style={{maxWidth:1080,margin:"0 auto",padding:"0 20px"}}>
        {tab==="ordens" && (
          <Ordens setores={setores} equipamentos={equipamentos} ordens={ordens} usuario={usuario} usuarios={usuarios} recarregar={recarregar}/>
        )}
        {tab==="equipamentos" && (
          <Equipamentos setores={setores} equipamentos={equipamentos} ordens={ordens} usuario={usuario} usuarios={usuarios} recarregar={recarregar}/>
        )}

        <p style={{fontSize:12,color:C.muted,textAlign:"center",marginTop:24}}>
          Conectado como <b>{usuario.nome}</b>{usuario.funcao?" · "+usuario.funcao:""}.
        </p>
      </main>
    </div>
  );
}
